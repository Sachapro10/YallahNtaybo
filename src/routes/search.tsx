import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecipeCard, type RecipeCardData } from "@/components/RecipeCard";
import { LANGUAGES } from "@/lib/languages";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  q: z.string().optional(),
  lang: z.string().optional(),
  book: z.string().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Search recipes — Yallah ntaybo" },
      { name: "description", content: "Find recipes by name, ingredient, language or book." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const params = useSearch({ from: "/search" });
  const navigate = useNavigate();
  const [q, setQ] = useState(params.q ?? "");
  const [lang, setLang] = useState(params.lang ?? "all");
  const [book, setBook] = useState(params.book ?? "all");

  useEffect(() => {
    setQ(params.q ?? "");
    setLang(params.lang ?? "all");
    setBook(params.book ?? "all");
  }, [params.q, params.lang, params.book]);

  const books = useQuery({
    queryKey: ["books", "all"],
    queryFn: async () => {
      const { data } = await supabase.from("recipe_books").select("id, name").order("name");
      return data ?? [];
    },
  });

  const results = useQuery({
    queryKey: ["search", params.q ?? "", params.lang ?? "", params.book ?? ""],
    queryFn: async () => {
      let query = supabase
        .from("recipes")
        .select(
          "id, title, description, image_path, cook_time_minutes, languages, default_language, book:recipe_books(id, name), author:profiles(display_name), translations:recipe_translations(ingredients_text)",
        )
        .order("created_at", { ascending: false })
        .limit(48);

      if (params.q) {
        query = query.or(
          `title.ilike.%${params.q}%,description.ilike.%${params.q}%`,
        );
      }
      if (params.lang && params.lang !== "all") {
        query = query.contains("languages", [params.lang]);
      }
      if (params.book && params.book !== "all") {
        query = query.eq("book_id", params.book);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as RecipeCardData[];
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({
      to: "/search",
      search: {
        q: q || undefined,
        lang: lang !== "all" ? lang : undefined,
        book: book !== "all" ? book : undefined,
      },
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">Search recipes</h1>
      <p className="mt-2 text-muted-foreground">
        Find recipes by title, language, or a specific Recipe Book.
      </p>

      <form
        onSubmit={submit}
        className="mt-8 grid grid-cols-1 gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft sm:grid-cols-[1fr_180px_200px_auto]"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="tagine, harira, msemen…"
            className="h-11 rounded-full border-border bg-background pl-11"
          />
        </div>
        <Select value={lang} onValueChange={setLang}>
          <SelectTrigger className="h-11 rounded-full">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any language</SelectItem>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.flag} {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={book} onValueChange={setBook}>
          <SelectTrigger className="h-11 rounded-full">
            <SelectValue placeholder="Book" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All books</SelectItem>
            {(books.data ?? []).map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" className="h-11 rounded-full px-6 shadow-warm">
          Search
        </Button>
      </form>

      <div className="mt-10">
        {results.isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : (results.data?.length ?? 0) === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="font-display text-2xl font-semibold">No recipes found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different search or clear the filters.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {results.data!.length} recipe{results.data!.length === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.data!.map((r) => (
                <RecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
