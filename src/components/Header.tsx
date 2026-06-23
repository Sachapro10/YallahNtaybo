import { Link, useNavigate } from "@tanstack/react-router";
import { ChefHat, Globe, LayoutDashboard, LogOut, Menu, Plus, Search, UserCircle2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { UI_LANGUAGES, useI18n } from "@/lib/i18n";

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-warm text-primary-foreground shadow-warm">
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">
            Yallah ntaybo
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
            activeOptions={{ exact: true }}
          >
            {t("nav.discover")}
          </Link>
          <Link
            to="/search"
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            {t("nav.search")}
          </Link>
          {user && (
            <Link
              to="/dashboard"
              className="rounded-full px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {t("nav.myKitchen")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("language.label")}>
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t("language.label")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {UI_LANGUAGES.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={lang === l.code ? "bg-secondary" : ""}
                >
                  <span className="mr-2">{l.flag}</span> {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="mt-8 flex flex-col gap-1">
                <MobileLink to="/" exact onSelect={() => setMobileOpen(false)}>
                  {t("nav.discover")}
                </MobileLink>
                <MobileLink to="/search" onSelect={() => setMobileOpen(false)}>
                  <Search className="mr-2 h-4 w-4" /> {t("nav.search")}
                </MobileLink>
                {user && (
                  <>
                    <MobileLink to="/dashboard" onSelect={() => setMobileOpen(false)}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> {t("nav.myKitchen")}
                    </MobileLink>
                    <MobileLink to="/upload" onSelect={() => setMobileOpen(false)}>
                      <Plus className="mr-2 h-4 w-4" /> {t("nav.newRecipe")}
                    </MobileLink>
                  </>
                )}
                <div className="my-3 h-px bg-border" />
                {user ? (
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      signOut();
                    }}
                    className="flex items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-secondary"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> {t("nav.signOut")}
                  </button>
                ) : (
                  <MobileLink to="/auth" onSelect={() => setMobileOpen(false)}>
                    {t("nav.signIn")}
                  </MobileLink>
                )}
              </div>
            </SheetContent>
          </Sheet>
          {user ? (
            <>
              <Button asChild variant="default" size="sm" className="hidden rounded-full sm:inline-flex">
                <Link to="/upload">
                  <Plus className="mr-1 h-4 w-4" /> {t("nav.newRecipe")}
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account">
                    <UserCircle2 className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" /> {t("nav.myKitchen")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/upload">
                      <Plus className="mr-2 h-4 w-4" /> {t("nav.newRecipe")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" /> {t("nav.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/auth">{t("nav.signIn")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileLink({
  to,
  exact,
  onSelect,
  children,
}: {
  to: string;
  exact?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to as any}
      onClick={onSelect}
      activeOptions={exact ? { exact: true } : undefined}
      activeProps={{ className: "bg-secondary text-foreground" }}
      className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-secondary"
    >
      {children}
    </Link>
  );
}
