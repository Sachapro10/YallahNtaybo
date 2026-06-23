import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChefHat, Clock, Languages, ListChecks, Loader2, UtensilsCrossed } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ShareButton } from "@/components/ShareButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { languageFlag, languageLabel } from "@/lib/languages";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/recipes/$recipeId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("recipes")
      .select(
        "*, book:recipe_books(id, name, cover_color), author:profiles(display_name, avatar_url), translations:recipe_translations(*), audios:recipe_audios(*)",
      )
      .eq("id", params.recipeId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} — Yallah ntaybo` : "Recipe — Yallah ntaybo" },
      {
        name: "description",
        content: loaderData?.description ?? "Listen to an audio recipe on Yallah ntaybo.",
      },
      { property: "og:title", content: loaderData?.title ?? "Recipe" },
      { property: "og:description", content: loaderData?.description ?? "Audio recipe" },
    ],
  }),
  component: RecipeDetail,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-semibold">Couldn't load this recipe</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-semibold">Recipe not found</h1>
      <Link to="/" className="mt-4 inline-block text-primary hover:underline">
        Back to discover
      </Link>
    </div>
  ),
});

function RecipeDetail() {
  const recipe = Route.useLoaderData();
  const params = Route.useParams();
  const img = useSignedUrl("recipe-images", recipe.image_path);

  const translations = (recipe.translations ?? []) as Array<{
    language: string;
    ingredients_text: string | null;
    steps_text: string | null;
  }>;
  const audios = (recipe.audios ?? []) as Array<{
    language: string;
    section: "ingredients" | "steps";
    audio_path: string;
  }>;

  const textLangs = translations.map((t) => t.language);
  const defaultText =
    textLangs.find((l) => l === recipe.default_language) ?? textLangs[0] ?? "darija";

  const ingredientsTracks = audios.filter((a) => a.section === "ingredients");
  const stepsTracks = audios.filter((a) => a.section === "steps");

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[2.5rem] border border-border bg-card shadow-warm">
          {img ? (
            <img
              src={img}
              alt={recipe.title}
              width={1024}
              height={1024}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-gradient-warm text-8xl">
              🍲
            </div>
          )}
        </div>
        <div className="flex flex-col justify-between">
          <div>
            {recipe.book && (
              <Link
                to="/books/$bookId"
                params={{ bookId: recipe.book.id }}
                className="text-sm font-medium uppercase tracking-wider text-primary hover:underline"
              >
                {recipe.book.name}
              </Link>
            )}
            <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">
              {recipe.title}
            </h1>
            {recipe.description && (
              <p className="mt-4 text-lg text-muted-foreground">{recipe.description}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {recipe.cook_time_minutes && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" /> {recipe.cook_time_minutes} min
                </span>
              )}
              {recipe.servings && (
                <span className="inline-flex items-center gap-1.5">
                  <UtensilsCrossed className="h-4 w-4 text-primary" /> {recipe.servings} servings
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Languages className="h-4 w-4 text-primary" />{" "}
                {recipe.languages.map((l: string) => languageFlag(l)).join(" ")}
              </span>
            </div>
            {recipe.author?.display_name && (
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-secondary/60 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-warm text-primary-foreground">
                  <ChefHat className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Shared by</p>
                  <p className="text-sm font-medium">{recipe.author.display_name}</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 flex items-center gap-2">
            <ShareButton path={`/recipes/${params.recipeId}`} title={recipe.title} />
          </div>
        </div>
      </div>

      {/* Audio players */}
      <section className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
        <AudioPlayer
          title="Listen to Ingredients"
          icon={<ListChecks className="h-5 w-5" />}
          accent="terracotta"
          tracks={ingredientsTracks}
          defaultLanguage={recipe.default_language}
        />
        <AudioPlayer
          title="Listen to Recipe Steps"
          icon={<UtensilsCrossed className="h-5 w-5" />}
          accent="saffron"
          tracks={stepsTracks}
          defaultLanguage={recipe.default_language}
        />
      </section>

      {/* Text content */}
      <section className="mt-12 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        {translations.length === 0 ? (
          <p className="text-center text-muted-foreground">No written version yet — listen above.</p>
        ) : (
          <Tabs defaultValue={defaultText}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold">Recipe</h2>
              <TabsList className="rounded-full">
                {translations.map((t) => (
                  <TabsTrigger key={t.language} value={t.language} className="rounded-full">
                    <span className="mr-1.5">{languageFlag(t.language)}</span>
                    {languageLabel(t.language)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {translations.map((t) => {
              const rtl = t.language === "arabic" || t.language === "darija";
              return (
                <TabsContent key={t.language} value={t.language} className="mt-6">
                  <div
                    dir={rtl ? "rtl" : "ltr"}
                    className="grid grid-cols-1 gap-8 md:grid-cols-5"
                  >
                    <div className="md:col-span-2">
                      <h3 className="font-display text-xl font-semibold text-primary">
                        Ingredients
                      </h3>
                      <div className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
                        {t.ingredients_text || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <h3 className="font-display text-xl font-semibold text-primary">Steps</h3>
                      <div className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
                        {t.steps_text || <span className="text-muted-foreground">—</span>}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </section>
    </article>
  );
}
