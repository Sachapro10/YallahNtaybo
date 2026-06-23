import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Trash2, UploadCloud, X } from "lucide-react";
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
import { LANGUAGES, languageFlag, languageLabel, type LanguageCode } from "@/lib/languages";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Upload recipes — Yallah ntaybo" }] }),
  component: UploadPage,
});

type LangContent = {
  language: LanguageCode;
  ingredients_text: string;
  steps_text: string;
  ingredients_audio?: File | null;
  steps_audio?: File | null;
};

type RecipeDraft = {
  id: string;
  title: string;
  description: string;
  cook_time: string;
  servings: string;
  image?: File | null;
  languages: LangContent[];
  default_language: LanguageCode;
};

const emptyLang = (code: LanguageCode): LangContent => ({
  language: code,
  ingredients_text: "",
  steps_text: "",
  ingredients_audio: null,
  steps_audio: null,
});

const newDraft = (): RecipeDraft => ({
  id: crypto.randomUUID(),
  title: "",
  description: "",
  cook_time: "",
  servings: "",
  image: null,
  languages: [emptyLang("darija")],
  default_language: "darija",
});

function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const books = useQuery({
    queryKey: ["upload", "books", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("recipe_books")
        .select("id, name")
        .eq("user_id", user!.id)
        .order("name");
      return data ?? [];
    },
  });

  const [bookMode, setBookMode] = useState<"none" | "existing" | "new">("none");
  const [bookId, setBookId] = useState<string>("");
  const [newBookName, setNewBookName] = useState("");
  const [drafts, setDrafts] = useState<RecipeDraft[]>([newDraft()]);
  const [busy, setBusy] = useState(false);

  function updateDraft(id: string, patch: Partial<RecipeDraft>) {
    setDrafts((d) => d.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addLanguage(draftId: string, code: LanguageCode) {
    setDrafts((d) =>
      d.map((r) =>
        r.id === draftId && !r.languages.find((l) => l.language === code)
          ? { ...r, languages: [...r.languages, emptyLang(code)] }
          : r,
      ),
    );
  }

  function removeLanguage(draftId: string, code: LanguageCode) {
    setDrafts((d) =>
      d.map((r) => {
        if (r.id !== draftId) return r;
        if (r.languages.length === 1) return r;
        const next = r.languages.filter((l) => l.language !== code);
        return {
          ...r,
          languages: next,
          default_language:
            r.default_language === code ? next[0].language : r.default_language,
        };
      }),
    );
  }

  function updateLang(draftId: string, code: LanguageCode, patch: Partial<LangContent>) {
    setDrafts((d) =>
      d.map((r) =>
        r.id === draftId
          ? {
              ...r,
              languages: r.languages.map((l) => (l.language === code ? { ...l, ...patch } : l)),
            }
          : r,
      ),
    );
  }

  async function submit() {
    if (!user) return;
    // Validate
    for (const d of drafts) {
      if (!d.title.trim()) return toast.error("Every recipe needs a title");
      if (!d.languages.find((l) => l.language === "darija"))
        return toast.error("Darija is required for at least one language entry");
    }

    setBusy(true);
    try {
      // Resolve book
      let targetBookId: string | null = null;
      if (bookMode === "existing" && bookId) targetBookId = bookId;
      else if (bookMode === "new" && newBookName.trim()) {
        const { data, error } = await supabase
          .from("recipe_books")
          .insert({ user_id: user.id, name: newBookName.trim() })
          .select("id")
          .single();
        if (error) throw error;
        targetBookId = data.id;
      }

      const createdIds: string[] = [];

      for (const d of drafts) {
        // Image upload
        let image_path: string | null = null;
        if (d.image) {
          const path = `${user.id}/${crypto.randomUUID()}-${sanitize(d.image.name)}`;
          const { error } = await supabase.storage
            .from("recipe-images")
            .upload(path, d.image, { upsert: false });
          if (error) throw error;
          image_path = path;
        }

        const languages = d.languages.map((l) => l.language);

        const { data: recipe, error: recErr } = await supabase
          .from("recipes")
          .insert({
            user_id: user.id,
            book_id: targetBookId,
            title: d.title.trim(),
            description: d.description.trim() || null,
            cook_time_minutes: d.cook_time ? parseInt(d.cook_time) : null,
            servings: d.servings ? parseInt(d.servings) : null,
            image_path,
            languages,
            default_language: d.default_language,
          })
          .select("id")
          .single();
        if (recErr) throw recErr;

        // Translations
        if (d.languages.length > 0) {
          const { error } = await supabase.from("recipe_translations").insert(
            d.languages.map((l) => ({
              recipe_id: recipe.id,
              language: l.language,
              ingredients_text: l.ingredients_text || null,
              steps_text: l.steps_text || null,
            })),
          );
          if (error) throw error;
        }

        // Audios
        for (const l of d.languages) {
          for (const section of ["ingredients", "steps"] as const) {
            const file = section === "ingredients" ? l.ingredients_audio : l.steps_audio;
            if (!file) continue;
            const path = `${user.id}/${recipe.id}/${l.language}-${section}-${sanitize(file.name)}`;
            const { error: upErr } = await supabase.storage
              .from("recipe-audio")
              .upload(path, file, { upsert: true });
            if (upErr) throw upErr;
            const { error: insErr } = await supabase.from("recipe_audios").insert({
              recipe_id: recipe.id,
              language: l.language,
              section,
              audio_path: path,
            });
            if (insErr) throw insErr;
          }
        }

        createdIds.push(recipe.id);
      }

      qc.invalidateQueries();
      toast.success(`${createdIds.length} recipe${createdIds.length === 1 ? "" : "s"} uploaded!`);
      if (createdIds.length === 1) navigate({ to: "/recipes/$recipeId", params: { recipeId: createdIds[0] } });
      else navigate({ to: "/dashboard" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-primary">Create</p>
        <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Share a recipe</h1>
        <p className="mt-2 text-muted-foreground">
          Upload one or many recipes at once. Group them into a Recipe Book if you'd like.
        </p>
      </div>

      {/* Book selection */}
      <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft">
        <h2 className="font-display text-xl font-semibold">Recipe Book (optional)</h2>
        <p className="text-sm text-muted-foreground">
          Group these recipes into a collection.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["none", "existing", "new"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setBookMode(m)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                bookMode === m
                  ? "border-primary bg-primary text-primary-foreground shadow-warm"
                  : "border-border bg-background text-foreground/70 hover:bg-secondary"
              }`}
            >
              {m === "none" ? "No book" : m === "existing" ? "Existing book" : "Create new"}
            </button>
          ))}
        </div>
        {bookMode === "existing" && (
          <Select value={bookId} onValueChange={setBookId}>
            <SelectTrigger className="mt-4 h-11 rounded-xl">
              <SelectValue placeholder="Choose a book…" />
            </SelectTrigger>
            <SelectContent>
              {(books.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
              {books.data?.length === 0 && (
                <SelectItem value="_" disabled>
                  You haven't created any books yet
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
        {bookMode === "new" && (
          <Input
            value={newBookName}
            onChange={(e) => setNewBookName(e.target.value)}
            placeholder="e.g. Ramadan Favorites"
            className="mt-4 h-11 rounded-xl"
            maxLength={80}
          />
        )}
      </section>

      {/* Recipe drafts */}
      <div className="mt-8 space-y-6">
        {drafts.map((d, idx) => (
          <RecipeForm
            key={d.id}
            index={idx}
            draft={d}
            onChange={(patch) => updateDraft(d.id, patch)}
            onRemove={drafts.length > 1 ? () => setDrafts((ds) => ds.filter((r) => r.id !== d.id)) : undefined}
            onAddLanguage={(c) => addLanguage(d.id, c)}
            onRemoveLanguage={(c) => removeLanguage(d.id, c)}
            onLangChange={(c, p) => updateLang(d.id, c, p)}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => setDrafts((d) => [...d, newDraft()])}
        >
          <Plus className="mr-1 h-4 w-4" /> Add another recipe (bulk)
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-full px-6 shadow-warm"
          size="lg"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          Upload {drafts.length > 1 ? `${drafts.length} recipes` : "recipe"}
        </Button>
      </div>
    </div>
  );
}

function RecipeForm({
  index,
  draft,
  onChange,
  onRemove,
  onAddLanguage,
  onRemoveLanguage,
  onLangChange,
}: {
  index: number;
  draft: RecipeDraft;
  onChange: (patch: Partial<RecipeDraft>) => void;
  onRemove?: () => void;
  onAddLanguage: (code: LanguageCode) => void;
  onRemoveLanguage: (code: LanguageCode) => void;
  onLangChange: (code: LanguageCode, patch: Partial<LangContent>) => void;
}) {
  const available = LANGUAGES.filter((l) => !draft.languages.find((ll) => ll.language === l.code));
  const activeTab = draft.languages[0]?.language;

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">Recipe #{index + 1}</h2>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove this recipe"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Title</Label>
          <Input
            value={draft.title}
            onChange={(e) => onChange({ title: e.target.value })}
            maxLength={120}
            placeholder="Tagine djaj zitoun w hamed"
            className="mt-1.5 h-11 rounded-xl"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Short description</Label>
          <Textarea
            value={draft.description}
            onChange={(e) => onChange({ description: e.target.value })}
            maxLength={400}
            rows={2}
            placeholder="A classic chicken tagine with preserved lemon and olives."
            className="mt-1.5 rounded-xl"
          />
        </div>
        <div>
          <Label>Cook time (min)</Label>
          <Input
            type="number"
            min={0}
            max={2000}
            value={draft.cook_time}
            onChange={(e) => onChange({ cook_time: e.target.value })}
            className="mt-1.5 h-11 rounded-xl"
          />
        </div>
        <div>
          <Label>Servings</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={draft.servings}
            onChange={(e) => onChange({ servings: e.target.value })}
            className="mt-1.5 h-11 rounded-xl"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Cover image</Label>
          <FileDrop
            file={draft.image ?? null}
            accept="image/*"
            onChange={(f) => onChange({ image: f })}
            hint="PNG / JPG up to 5MB"
          />
        </div>
      </div>

      {/* Languages */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-base">Languages</Label>
          {available.length > 0 && (
            <Select value="" onValueChange={(v) => onAddLanguage(v as LanguageCode)}>
              <SelectTrigger className="h-9 w-[180px] rounded-full">
                <SelectValue placeholder="+ Add language" />
              </SelectTrigger>
              <SelectContent>
                {available.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.flag} {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs defaultValue={activeTab} className="mt-3">
          <TabsList className="flex-wrap rounded-full">
            {draft.languages.map((l) => (
              <TabsTrigger key={l.language} value={l.language} className="rounded-full">
                {languageFlag(l.language)} {languageLabel(l.language)}
              </TabsTrigger>
            ))}
          </TabsList>
          {draft.languages.map((l) => (
            <TabsContent key={l.language} value={l.language} className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={`def-${draft.id}-${l.language}`}
                    name={`def-${draft.id}`}
                    checked={draft.default_language === l.language}
                    onChange={() => onChange({ default_language: l.language })}
                    className="h-4 w-4 accent-primary"
                  />
                  <label htmlFor={`def-${draft.id}-${l.language}`} className="text-sm text-muted-foreground">
                    Set as default language
                  </label>
                </div>
                {draft.languages.length > 1 && l.language !== "darija" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveLanguage(l.language)}
                    className="rounded-full text-muted-foreground"
                  >
                    <X className="mr-1 h-3 w-3" /> Remove
                  </Button>
                )}
              </div>
              <div>
                <Label>Ingredients</Label>
                <Textarea
                  value={l.ingredients_text}
                  onChange={(e) => onLangChange(l.language, { ingredients_text: e.target.value })}
                  rows={5}
                  placeholder={"- 1 kg chicken\n- 2 preserved lemons\n- 1 cup olives\n…"}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label>Steps</Label>
                <Textarea
                  value={l.steps_text}
                  onChange={(e) => onLangChange(l.language, { steps_text: e.target.value })}
                  rows={6}
                  placeholder={"1. Heat olive oil in the tagine…\n2. Add onion and spices…"}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Ingredients audio</Label>
                  <FileDrop
                    file={l.ingredients_audio ?? null}
                    accept="audio/*"
                    onChange={(f) => onLangChange(l.language, { ingredients_audio: f })}
                    hint=".mp3, .wav, .m4a"
                  />
                </div>
                <div>
                  <Label>Steps audio</Label>
                  <FileDrop
                    file={l.steps_audio ?? null}
                    accept="audio/*"
                    onChange={(f) => onLangChange(l.language, { steps_audio: f })}
                    hint=".mp3, .wav, .m4a"
                  />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

function FileDrop({
  file,
  accept,
  onChange,
  hint,
}: {
  file: File | null;
  accept: string;
  onChange: (f: File | null) => void;
  hint?: string;
}) {
  return (
    <div className="mt-1.5">
      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/50 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            className="rounded-full"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/50 px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-secondary/40">
          <UploadCloud className="h-4 w-4" />
          <span>Click to upload {hint ? `· ${hint}` : ""}</span>
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}
