import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ChefHat, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookCard, type BookCardData } from "@/components/BookCard";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "My Kitchen — Yallah ntaybo" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const myRecipes = useQuery({
    queryKey: ["dashboard", "recipes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, title, description, created_at, book_id, book:recipe_books(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const myBooks = useQuery({
    queryKey: ["dashboard", "books", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_books")
        .select("id, name, description, cover_color, recipes(count)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
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

  async function deleteRecipe(id: string) {
    if (!confirm("Delete this recipe? This cannot be undone.")) return;
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Recipe deleted");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-primary">My Kitchen</p>
          <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Your recipes</h1>
        </div>
        <Button asChild className="rounded-full shadow-warm">
          <Link to="/upload">
            <Plus className="mr-1 h-4 w-4" /> New recipe
          </Link>
        </Button>
      </div>

      {/* Books */}
      <section className="mt-12">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Recipe Books</h2>
          <CreateBookDialog onCreated={() => qc.invalidateQueries({ queryKey: ["dashboard", "books"] })} />
        </div>
        {(myBooks.data?.length ?? 0) === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-display text-xl font-semibold">No books yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Group your recipes into collections like "Ramadan favorites" or "Tagines".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {myBooks.data!.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>

      {/* Recipes */}
      <section className="mt-14">
        <h2 className="mb-5 font-display text-2xl font-semibold">All your recipes</h2>
        {(myRecipes.data?.length ?? 0) === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
            <ChefHat className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-display text-xl font-semibold">Nothing simmering yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first recipe — single, or in bulk.
            </p>
            <Button asChild className="mt-5 rounded-full shadow-warm">
              <Link to="/upload">
                <Plus className="mr-1 h-4 w-4" /> Upload a recipe
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
            {myRecipes.data!.map((r: any) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-secondary/40"
              >
                <Link
                  to="/recipes/$recipeId"
                  params={{ recipeId: r.id }}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate font-display text-lg font-semibold">{r.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {r.book?.name ? `${r.book.name} · ` : ""}
                    {r.description ?? "No description"}
                  </p>
                </Link>
                <Select
                  value={r.book_id ?? "none"}
                  onValueChange={async (val) => {
                    const newBookId = val === "none" ? null : val;
                    const { error } = await supabase
                      .from("recipes")
                      .update({ book_id: newBookId })
                      .eq("id", r.id);
                    if (error) toast.error(error.message);
                    else {
                      toast.success("Recipe moved");
                      qc.invalidateQueries({ queryKey: ["dashboard"] });
                    }
                  }}
                >
                  <SelectTrigger className="h-9 w-44 rounded-full text-xs">
                    <SelectValue placeholder="Add to book…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No book</SelectItem>
                    {(myBooks.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Edit recipe"
                >
                  <Link to="/recipes/$recipeId/edit" params={{ recipeId: r.id }}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteRecipe(r.id)}
                  className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete recipe"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const COLORS = ["terracotta", "saffron", "amber", "charcoal", "cream"];

function CreateBookDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState("terracotta");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("recipe_books").insert({
      user_id: user.id,
      name,
      description: desc || null,
      cover_color: color,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Recipe Book created");
      setOpen(false);
      setName("");
      setDesc("");
      onCreated();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <Plus className="mr-1 h-4 w-4" /> New book
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create a Recipe Book</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="bookname">Name</Label>
            <Input
              id="bookname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              placeholder="Ramadan Favorites"
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="bookdesc">Description</Label>
            <Textarea
              id="bookdesc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={300}
              placeholder="A short note about this collection…"
              className="mt-1.5 rounded-xl"
              rows={3}
            />
          </div>
          <div>
            <Label>Cover color</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLORS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy || !name} className="rounded-full shadow-warm">
              Create book
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
