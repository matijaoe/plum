export const SHIKI_THEMES = {
  light: "vitesse-light",
  dark: "vitesse-dark",
} as const;

export const SHIKI_THEME_VALUES = [SHIKI_THEMES.light, SHIKI_THEMES.dark] as const;

export const SHIKI_FALLBACK_LANGUAGE = "text" as const;
