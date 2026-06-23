import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShareButton } from "@/components/ShareButton";
import { RecipeCard, type RecipeCardData } from "@/components/RecipeCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/books/$bookId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("recipe_books")
      .select("*, author:profiles(display_name)")
      .eq("id", params.bookId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} — Recipe Book` : "Recipe Book" },
      { name: "description", content: loaderData?.description ?? "A collection of recipes." },
      { property: "og:title", content: loaderData?.name ?? "Recipe Book" },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const book = Route.useLoaderData();
  const params = Route.useParams();

  const recipes = useQuery({
    queryKey: ["book", params.bookId, "recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select(
          "id, title, description, image_path, cook_time_minutes, languages, default_language, author:profiles(display_name)",
        )
        .eq("book_id", params.bookId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RecipeCardData[];
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-[2.5rem] bg-gradient-warm p-10 text-primary-foreground shadow-warm sm:p-14">
        <p className="text-sm font-medium uppercase tracking-wider opacity-90">Recipe Book</p>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-6xl">{book.name}</h1>
        {book.description && (
          <p className="mt-4 max-w-2xl text-base opacity-95 sm:text-lg">{book.description}</p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <ShareButton path={`/books/${params.bookId}`} title={book.name} />
        </div>
      </div>

      <h2 className="mb-6 mt-12 font-display text-2xl font-semibold">Recipes in this book</h2>
      {recipes.isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : (recipes.data?.length ?? 0) === 0 ? (
        <p className="text-muted-foreground">No recipes in this book yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.data!.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  );
}
