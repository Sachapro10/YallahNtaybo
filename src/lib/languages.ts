export type LanguageCode = "darija" | "arabic" | "french" | "english" | "spanish";

export const LANGUAGES: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "darija", label: "Darija", flag: "🇲🇦" },
  { code: "arabic", label: "العربية", flag: "🇸🇦" },
  { code: "french", label: "Français", flag: "🇫🇷" },
  { code: "english", label: "English", flag: "🇬🇧" },
  { code: "spanish", label: "Español", flag: "🇪🇸" },
];

export const languageLabel = (code: string) =>
  LANGUAGES.find((l) => l.code === code)?.label ?? code;

export const languageFlag = (code: string) =>
  LANGUAGES.find((l) => l.code === code)?.flag ?? "🌐";
