import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ChefHat, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Yallah ntaybo" },
      { name: "description", content: "Sign in or create an account to share recipes." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: redirect || "/dashboard" });
    }
  }, [user, loading, navigate, redirect]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-warm text-primary-foreground shadow-warm">
          <ChefHat className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold">Welcome to Yallah ntaybo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Share recipes from your kitchen with the world.
        </p>
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft">
        <GoogleButton />
        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2 rounded-full">
            <TabsTrigger value="signin" className="rounded-full">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full">
              Sign up
            </TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="mt-5">
            <EmailForm mode="signin" />
          </TabsContent>
          <TabsContent value="signup" className="mt-5">
            <EmailForm mode="signup" />
          </TabsContent>
        </Tabs>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By continuing you agree to our friendly{" "}
        <Link to="/" className="underline">
          terms
        </Link>
        .
      </p>
    </div>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  async function signIn() {
    setBusy(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) toast.error("Google sign-in failed");
    } catch (e) {
      toast.error("Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full rounded-full"
      onClick={signIn}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.2-4.8 9.2-7.3 0-.5-.1-.9-.1-1.4H12z"
          />
        </svg>
      )}
      Continue with Google
    </Button>
  );
}

function EmailForm({ mode }: { mode: "signin" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {mode === "signup" && (
        <div className="space-y-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lalla Aicha"
            className="h-11 rounded-xl"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-xl"
        />
      </div>
      <Button type="submit" disabled={busy} className="h-11 w-full rounded-full shadow-warm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}
