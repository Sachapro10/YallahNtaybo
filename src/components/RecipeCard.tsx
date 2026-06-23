import { Link } from "@tanstack/react-router";
import { Clock, Languages, Mic } from "lucide-react";
import { useSignedUrl } from "@/hooks/use-signed-url";

export interface RecipeCardData {
  id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  cook_time_minutes: number | null;
  languages: string[];
  default_language: string;
  book?: { id: string; name: string } | null;
  author?: { display_name: string | null } | null;
}

export function RecipeCard({ recipe }: { recipe: RecipeCardData }) {
  const img = useSignedUrl("recipe-images", recipe.image_path);
  return (
    <Link
      to="/recipes/$recipeId"
      params={{ recipeId: recipe.id }}
      className="group block overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-warm"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-warm">
        {img ? (
          <img
            src={img}
            alt={recipe.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">🍲</div>
        )}
        {recipe.book && (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
            {recipe.book.name}
          </span>
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/95 px-2.5 py-1 text-xs font-medium text-primary-foreground">
          <Mic className="h-3 w-3" /> Audio
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-display text-xl font-semibold leading-tight text-foreground">
          {recipe.title}
        </h3>
        {recipe.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {recipe.description}
          </p>
        )}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          {recipe.cook_time_minutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {recipe.cook_time_minutes} min
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Languages className="h-3.5 w-3.5" /> {recipe.languages.length} lang
            {recipe.languages.length === 1 ? "" : "s"}
          </span>
          {recipe.author?.display_name && (
            <span className="ml-auto truncate">by {recipe.author.display_name}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
