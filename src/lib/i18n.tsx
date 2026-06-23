import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const UI_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "ary", label: "Darija", flag: "🇲🇦" },
] as const;

export type UILang = (typeof UI_LANGUAGES)[number]["code"];

type Dict = Record<string, string>;

const translations: Record<UILang, Dict> = {
  en: {
    "nav.discover": "Discover",
    "nav.search": "Search",
    "nav.myKitchen": "My Kitchen",
    "nav.newRecipe": "New recipe",
    "nav.signIn": "Sign in",
    "nav.signOut": "Sign out",
    "hero.badge": "Audio-first recipe community",
    "hero.titleA": "Cook with",
    "hero.titleB": "community curated",
    "hero.titleC": "menus.",
    "hero.subtitle":
      "Yallah ntaybo is a crowdsourced kitchen where every recipe comes with audio in Moroccan Darija — plus French, Arabic, English and more. Press play, keep your hands in the pot.",
    "hero.searchPlaceholder": "Search tagine, harira, msemen…",
    "hero.search": "Search",
    "hero.chipAudio": "Audio in Darija",
    "hero.chipMulti": "Multi-language",
    "hero.share": "Share your recipe",
    "home.booksKicker": "Recipe Books",
    "home.booksTitle": "Curated collections",
    "home.trendingKicker": "Fresh from the kitchen",
    "home.trendingTitle": "Trending recipes",
    "home.browseAll": "Browse all →",
    "language.label": "Language",
  },
  fr: {
    "nav.discover": "Découvrir",
    "nav.search": "Rechercher",
    "nav.myKitchen": "Ma cuisine",
    "nav.newRecipe": "Nouvelle recette",
    "nav.signIn": "Connexion",
    "nav.signOut": "Déconnexion",
    "hero.badge": "Communauté de recettes audio",
    "hero.titleA": "Cuisinez avec",
    "hero.titleB": "des menus choisis",
    "hero.titleC": "par la communauté.",
    "hero.subtitle":
      "Yallah ntaybo est une cuisine collaborative où chaque recette est accompagnée d'un audio en darija marocaine — et aussi en français, arabe, anglais et plus. Appuyez sur lecture, gardez les mains dans la marmite.",
    "hero.searchPlaceholder": "Cherchez tajine, harira, msemen…",
    "hero.search": "Rechercher",
    "hero.chipAudio": "Audio en darija",
    "hero.chipMulti": "Multilingue",
    "hero.share": "Partager votre recette",
    "home.booksKicker": "Livres de recettes",
    "home.booksTitle": "Collections choisies",
    "home.trendingKicker": "Sorti de la cuisine",
    "home.trendingTitle": "Recettes tendance",
    "home.browseAll": "Tout parcourir →",
    "language.label": "Langue",
  },
  ar: {
    "nav.discover": "اكتشف",
    "nav.search": "بحث",
    "nav.myKitchen": "مطبخي",
    "nav.newRecipe": "وصفة جديدة",
    "nav.signIn": "تسجيل الدخول",
    "nav.signOut": "تسجيل الخروج",
    "hero.badge": "مجتمع وصفات صوتية",
    "hero.titleA": "اطبخ مع",
    "hero.titleB": "قوائم منتقاة",
    "hero.titleC": "من المجتمع.",
    "hero.subtitle":
      "يلا نطيبو مطبخ تشاركي حيث تأتي كل وصفة بمقطع صوتي بالدارجة المغربية — والفرنسية والعربية والإنجليزية والمزيد. اضغط على تشغيل وابق يديك في القدر.",
    "hero.searchPlaceholder": "ابحث عن طاجين، حريرة، مسمن…",
    "hero.search": "بحث",
    "hero.chipAudio": "صوت بالدارجة",
    "hero.chipMulti": "متعدد اللغات",
    "hero.share": "شارك وصفتك",
    "home.booksKicker": "كتب الوصفات",
    "home.booksTitle": "مجموعات منتقاة",
    "home.trendingKicker": "طازج من المطبخ",
    "home.trendingTitle": "وصفات رائجة",
    "home.browseAll": "تصفح الكل →",
    "language.label": "اللغة",
  },
  ary: {
    "nav.discover": "اكتشف",
    "nav.search": "قلّب",
    "nav.myKitchen": "كوزينتي",
    "nav.newRecipe": "وصفة جديدة",
    "nav.signIn": "دخول",
    "nav.signOut": "خروج",
    "hero.badge": "مجتمع الوصفات بالصوت",
    "hero.titleA": "طيّب مع",
    "hero.titleB": "مينوهات مختارة",
    "hero.titleC": "من المجتمع.",
    "hero.subtitle":
      "يلا نطيبو هي كوزينة جماعية، كل وصفة فيها صوت بالدارجة — وزيد الفرنسية، العربية، الإنجليزية وبزاف. زيد دير Play وخلي يديك فالطنجرة.",
    "hero.searchPlaceholder": "قلّب على طاجين، حريرة، مسمّن…",
    "hero.search": "قلّب",
    "hero.chipAudio": "صوت بالدارجة",
    "hero.chipMulti": "بزاف ديال اللغات",
    "hero.share": "شارك الوصفة ديالك",
    "home.booksKicker": "كتب الوصفات",
    "home.booksTitle": "مجموعات مختارة",
    "home.trendingKicker": "جديد من الكوزينة",
    "home.trendingTitle": "وصفات رائجة",
    "home.browseAll": "شوف الكل →",
    "language.label": "اللغة",
  },
};

const STORAGE_KEY = "yn.uiLang";
const RTL: UILang[] = ["ar", "ary"];

type Ctx = { lang: UILang; setLang: (l: UILang) => void; t: (key: string) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Always start with "en" so SSR and the first client render match.
  // Hydrate the stored preference after mount to avoid hydration mismatch.
  const [lang, setLangState] = useState<UILang>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as UILang | null;
      if (stored && translations[stored]) {
        setLangState(stored);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL.includes(lang) ? "rtl" : "ltr";
  }, [lang]);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang: (l) => {
        setLangState(l);
        try {
          localStorage.setItem(STORAGE_KEY, l);
        } catch {}
      },
      t: (key) => translations[lang][key] ?? translations.en[key] ?? key,
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
