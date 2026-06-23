import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/lib/languages";

export const Route = createFileRoute("/_authenticated/recipes/$recipeId/edit")({
  head: () => ({ meta: [{ title: "Edit recipe — Yallah ntaybo" }] }),
  component: EditRecipe,
});

function EditRecipe() {
  const { recipeId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cookTime, setCookTime] = useState<string>("");
  const [servings, setServings] = useState<string>("");
  const [bookId, setBookId] = useState<string>("none");
  const [translations, setTranslations] = useState<
    Record<string, { ingredients_text: string; steps_text: string }>
  >({});
  const [saving, setSaving] = useState(false);

  const data = useQuery({
    queryKey: ["edit-recipe", recipeId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*, translations:recipe_translations(*)")
        .eq("id", recipeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const books = useQuery({
    queryKey: ["edit-recipe-books", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_books")
        .select("id, name")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!data.data) return;
    const r = data.data;
    setTitle(r.title ?? "");
    setDescription(r.description ?? "");
    setCookTime(r.cook_time_minutes ? String(r.cook_time_minutes) : "");
    setServings(r.servings ? String(r.servings) : "");
    setBookId(r.book_id ?? "none");
    const tx: Record<string, { ingredients_text: string; steps_text: string }> = {};
    for (const lang of r.languages ?? []) {
      const t = (r.translations ?? []).find((x: any) => x.language === lang);
      tx[lang] = {
        ingredients_text: t?.ingredients_text ?? "",
        steps_text: t?.steps_text ?? "",
      };
    }
    setTranslations(tx);
  }, [data.data]);

  if (data.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Recipe not found</h1>
        <Button asChild className="mt-4 rounded-full">
          <Link to="/dashboard">Back to My Kitchen</Link>
        </Button>
      </div>
    );
  }

  if (data.data.user_id !== user?.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">You can't edit this recipe</h1>
        <p className="mt-2 text-muted-foreground">Only the original author can edit it.</p>
      </div>
    );
  }

  const recipeLanguages: string[] = data.data.languages ?? [];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error: upErr } = await supabase
        .from("recipes")
        .update({
          title,
          description: description || null,
          cook_time_minutes: cookTime ? Number(cookTime) : null,
          servings: servings ? Number(servings) : null,
          book_id: bookId === "none" ? null : bookId,
        })
        .eq("id", recipeId);
      if (upErr) throw upErr;

      for (const [lang, vals] of Object.entries(translations)) {
        const { error } = await supabase
          .from("recipe_translations")
          .upsert(
            {
              recipe_id: recipeId,
              language: lang,
              ingredients_text: vals.ingredients_text || null,
              steps_text: vals.steps_text || null,
            },
            { onConflict: "recipe_id,language" },
          );
        if (error) throw error;
      }

      toast.success("Recipe updated");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["recipe", recipeId] });
      navigate({ to: "/recipes/$recipeId", params: { recipeId } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> My Kitchen
      </Link>
      <h1 className="mt-3 font-display text-4xl font-semibold">Edit recipe</h1>

      <form onSubmit={save} className="mt-8 space-y-5">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1.5 h-11 rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1.5 rounded-xl"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cook">Cook time (min)</Label>
            <Input
              id="cook"
              type="number"
              min="0"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="srv">Servings</Label>
            <Input
              id="srv"
              type="number"
              min="0"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
        </div>
        <div>
          <Label>Recipe book</Label>
          <Select value={bookId} onValueChange={setBookId}>
            <SelectTrigger className="mt-1.5 h-11 rounded-xl">
              <SelectValue placeholder="No book" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No book</SelectItem>
              {(books.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {recipeLanguages.length > 0 && (
          <div>
            <Label>Translations</Label>
            <Tabs defaultValue={recipeLanguages[0]} className="mt-1.5">
              <TabsList className="flex-wrap">
                {recipeLanguages.map((l) => (
                  <TabsTrigger key={l} value={l}>
                    {LANGUAGES.find((x) => x.code === l)?.label ?? l}
                  </TabsTrigger>
                ))}
              </TabsList>
              {recipeLanguages.map((l) => (
                <TabsContent key={l} value={l} className="space-y-3">
                  <div>
                    <Label htmlFor={`ing-${l}`}>Ingredients</Label>
                    <Textarea
                      id={`ing-${l}`}
                      rows={6}
                      value={translations[l]?.ingredients_text ?? ""}
                      onChange={(e) =>
                        setTranslations((prev) => ({
                          ...prev,
                          [l]: {
                            ingredients_text: e.target.value,
                            steps_text: prev[l]?.steps_text ?? "",
                          },
                        }))
                      }
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`stp-${l}`}>Steps</Label>
                    <Textarea
                      id={`stp-${l}`}
                      rows={8}
                      value={translations[l]?.steps_text ?? ""}
                      onChange={(e) =>
                        setTranslations((prev) => ({
                          ...prev,
                          [l]: {
                            ingredients_text: prev[l]?.ingredients_text ?? "",
                            steps_text: e.target.value,
                          },
                        }))
                      }
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button asChild type="button" variant="outline" className="rounded-full">
            <Link to="/dashboard">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving || !title} className="rounded-full shadow-warm">
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
