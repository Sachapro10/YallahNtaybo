import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { I18nProvider } from "@/lib/i18n";

function NotFoundComponent() {
  return (
    <I18nProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-md text-center">
            <p className="font-display text-7xl font-semibold text-primary">404</p>
            <h1 className="mt-4 font-display text-2xl font-semibold">Recipe not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The page you're looking for has wandered off. Let's get you back to the kitchen.
            </p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-warm transition-colors hover:bg-primary/90"
              >
                Back to Discover
              </Link>
            </div>
          </div>
        </div>
      </div>
    </I18nProvider>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Something burned in the kitchen
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Try refreshing the page or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Yallah Ntaybo Recipes With Audio" },
      {
        name: "description",
        content:
          "A crowdsourced recipe community with audio narrations in Darija and more. Listen, cook and share the recipes that mean home.",
      },
      { name: "author", content: "Tbikha" },
      { property: "og:title", content: "Yallah Ntaybo Recipes With Audio" },
      {
        property: "og:description",
        content: "Cook hands-free with audio recipes in Moroccan Darija and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Yallah Ntaybo Recipes With Audio" },
      { name: "description", content: "Darija Bites is a modern recipe-sharing website for uploading, viewing, and listening to recipes." },
      { property: "og:description", content: "Darija Bites is a modern recipe-sharing website for uploading, viewing, and listening to recipes." },
      { name: "twitter:description", content: "Darija Bites is a modern recipe-sharing website for uploading, viewing, and listening to recipes." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/11eea27e-2991-4116-b355-708e7b8e8ce4" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/11eea27e-2991-4116-b355-708e7b8e8ce4" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <div className="flex min-h-screen flex-col bg-background">
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
          <footer className="mt-16 border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
            <p>
              <span className="font-display text-base text-foreground">Yallah ntaybo</span> · Recipes
              from every kitchen, narrated with love.
            </p>
          </footer>
        </div>
      </I18nProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "rounded-2xl border border-border bg-card text-card-foreground shadow-warm",
          },
        }}
      />
    </QueryClientProvider>
  );
}
