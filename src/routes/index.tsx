import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Mic2, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecipeCard, type RecipeCardData } from "@/components/RecipeCard";
import { BookCard, type BookCardData } from "@/components/BookCard";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yallah ntaybo — Audio recipes from Moroccan kitchens" },
      {
        name: "description",
        content:
          "Discover crowdsourced recipes narrated in Moroccan Darija and more. Listen, cook and share.",
      },
      { property: "og:title", content: "Yallah ntaybo — Audio recipes from Moroccan kitchens" },
      {
        property: "og:description",
        content: "Audio-first recipe sharing community with Darija narration.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { t } = useI18n();

  const recipes = useQuery({
    queryKey: ["recipes", "trending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select(
          "id, title, description, image_path, cook_time_minutes, languages, default_language, book:recipe_books(id, name), author:profiles(display_name)",
        )
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as unknown as RecipeCardData[];
    },
  });

  const books = useQuery({
    queryKey: ["books", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_books")
        .select("id, name, description, cover_color, recipes(count)")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return (data ?? []).map((b: any) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        cover_color: b.cover_color,
        recipe_count: b.recipes?.[0]?.count ?? 0,
      })) as BookCardData[];
    },
  });

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/search", search: { q } });
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-cream">
        <div className="absolute inset-0 -z-10 bg-gradient-warm opacity-10" />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("hero.badge")}
          </span>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            {t("hero.titleA")}{" "}
            <span className="text-primary">{t("hero.titleB")}</span>{" "}
            {t("hero.titleC")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            {t("hero.subtitle")}
          </p>

          <form onSubmit={onSearch} className="mx-auto mt-8 flex max-w-xl items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("hero.searchPlaceholder")}
                className="h-12 rounded-full border-border bg-card pl-11 pr-4 shadow-soft"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 rounded-full px-6 shadow-warm">
              {t("hero.search")}
            </Button>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <Mic2 className="h-3.5 w-3.5 text-primary" /> {t("hero.chipAudio")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              🇲🇦 🇫🇷 🇸🇦 🇬🇧 {t("hero.chipMulti")}
            </span>
            <Link
              to="/upload"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              {t("hero.share")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured books */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              {t("home.booksKicker")}
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
              {t("home.booksTitle")}
            </h2>
          </div>
        </div>
        {books.isLoading ? (
          <SkeletonGrid />
        ) : (books.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No recipe books yet"
            body="Be the first to create a collection — group Ramadan favorites, weeknight dinners, or family classics."
            cta="Create a Recipe Book"
            to="/upload"
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {books.data!.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              {t("home.trendingKicker")}
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
              {t("home.trendingTitle")}
            </h2>
          </div>
          <Link to="/search" className="text-sm font-medium text-primary hover:underline">
            {t("home.browseAll")}
          </Link>
        </div>
        {recipes.isLoading ? (
          <SkeletonGrid />
        ) : (recipes.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="The kitchen is quiet"
            body="No recipes have been shared yet. Help start the community by uploading the first one."
            cta="Upload your first recipe"
            to="/upload"
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recipes.data!.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl bg-muted" />
      ))}
    </div>
  );
}

function EmptyState({
  title,
  body,
  cta,
  to,
}: {
  title: string;
  body: string;
  cta: string;
  to: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      <Button asChild className="mt-6 rounded-full shadow-warm">
        <Link to={to}>{cta}</Link>
      </Button>
    </div>
  );
}
