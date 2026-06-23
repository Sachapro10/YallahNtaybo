import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

const COLOR_MAP: Record<string, string> = {
  terracotta: "from-primary to-spice",
  saffron: "from-saffron to-accent",
  amber: "from-accent to-saffron",
  charcoal: "from-charcoal to-spice",
  cream: "from-amber-warm to-saffron",
};

export interface BookCardData {
  id: string;
  name: string;
  description: string | null;
  cover_color: string;
  recipe_count?: number;
}

export function BookCard({ book }: { book: BookCardData }) {
  const grad = COLOR_MAP[book.cover_color] ?? COLOR_MAP.terracotta;
  return (
    <Link
      to="/books/$bookId"
      params={{ bookId: book.id }}
      className={`group relative flex aspect-[5/6] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br ${grad} p-6 text-primary-foreground shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-glow`}
    >
      <div className="flex items-center gap-2 text-sm font-medium opacity-90">
        <BookOpen className="h-4 w-4" /> Recipe Book
      </div>
      <div>
        <h3 className="font-display text-2xl font-semibold leading-tight">{book.name}</h3>
        {book.description && (
          <p className="mt-1.5 line-clamp-2 text-sm opacity-90">{book.description}</p>
        )}
        <p className="mt-3 text-xs uppercase tracking-wider opacity-80">
          {book.recipe_count ?? 0} {book.recipe_count === 1 ? "recipe" : "recipes"}
        </p>
      </div>
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
    </Link>
  );
}
