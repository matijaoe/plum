import { Circle, CircleHalf } from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const cycleTheme = () => {
    const next = { system: "light", light: "dark", dark: "system" } as const;
    setTheme(next[(theme as keyof typeof next) ?? "system"]);
  };

  useHotkey("Mod+J", cycleTheme, { preventDefault: true });

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={
        theme === "system"
          ? "Using system theme, switch to light"
          : dark
            ? "Switch to system theme"
            : "Switch to dark mode"
      }
      className="cursor-pointer p-2 text-muted transition-[color,transform] duration-150 hover:text-foreground active:scale-90"
    >
      {theme === "system" ? (
        <CircleHalf size={18} weight="bold" />
      ) : dark ? (
        <Circle size={18} weight="fill" />
      ) : (
        <Circle size={18} weight="bold" />
      )}
    </button>
  );
}
