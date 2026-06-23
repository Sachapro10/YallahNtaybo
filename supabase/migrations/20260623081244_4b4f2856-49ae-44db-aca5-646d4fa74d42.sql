
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recipe Books
CREATE TABLE public.recipe_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_color TEXT NOT NULL DEFAULT 'terracotta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recipe_books TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_books TO authenticated;
GRANT ALL ON public.recipe_books TO service_role;
ALTER TABLE public.recipe_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Books are viewable by everyone" ON public.recipe_books FOR SELECT USING (true);
CREATE POLICY "Users can create own books" ON public.recipe_books FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own books" ON public.recipe_books FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own books" ON public.recipe_books FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER recipe_books_updated_at BEFORE UPDATE ON public.recipe_books FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recipes
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.recipe_books(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_path TEXT,
  cook_time_minutes INT,
  servings INT,
  default_language TEXT NOT NULL DEFAULT 'darija',
  languages TEXT[] NOT NULL DEFAULT ARRAY['darija']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recipes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recipes are viewable by everyone" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Users can create own recipes" ON public.recipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recipes" ON public.recipes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recipes" ON public.recipes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX recipes_user_idx ON public.recipes(user_id);
CREATE INDEX recipes_book_idx ON public.recipes(book_id);
CREATE INDEX recipes_title_idx ON public.recipes USING GIN (to_tsvector('simple', title));

-- Recipe translations (text per language)
CREATE TABLE public.recipe_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  ingredients_text TEXT,
  steps_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, language)
);
GRANT SELECT ON public.recipe_translations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_translations TO authenticated;
GRANT ALL ON public.recipe_translations TO service_role;
ALTER TABLE public.recipe_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Translations are viewable by everyone" ON public.recipe_translations FOR SELECT USING (true);
CREATE POLICY "Users manage own recipe translations" ON public.recipe_translations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

-- Recipe audios
CREATE TYPE public.audio_section AS ENUM ('ingredients', 'steps');
CREATE TABLE public.recipe_audios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  section public.audio_section NOT NULL,
  audio_path TEXT NOT NULL,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, language, section)
);
GRANT SELECT ON public.recipe_audios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_audios TO authenticated;
GRANT ALL ON public.recipe_audios TO service_role;
ALTER TABLE public.recipe_audios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audios are viewable by everyone" ON public.recipe_audios FOR SELECT USING (true);
CREATE POLICY "Users manage own recipe audios" ON public.recipe_audios FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

-- Storage policies
-- recipe-audio: public read, owner write under {user_id}/...
CREATE POLICY "Recipe audio is publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'recipe-audio');
CREATE POLICY "Users upload own recipe audio" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'recipe-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own recipe audio" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'recipe-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own recipe audio" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'recipe-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Recipe images are publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'recipe-images');
CREATE POLICY "Users upload own recipe images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own recipe images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own recipe images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars are publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
