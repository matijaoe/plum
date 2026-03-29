import { Circle, CircleHalf } from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";

const iconTransition = { type: "spring" as const, duration: 0.3, bounce: 0 };

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const cycleTheme = () => {
    const next = { system: "light", light: "dark", dark: "system" } as const;
    setTheme(next[(theme as keyof typeof next) ?? "system"]);
  };

  useHotkey("Mod+J", cycleTheme, { preventDefault: true });

  const iconKey = theme === "system" ? "system" : dark ? "dark" : "light";

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
      className="relative flex size-10 cursor-pointer items-center justify-center text-muted transition-[color,scale] duration-150 ease-out hover:text-foreground active:scale-[0.96]"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={iconKey}
          initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          transition={iconTransition}
          className="flex items-center justify-center"
        >
          {theme === "system" ? (
            <CircleHalf size={18} weight="bold" />
          ) : dark ? (
            <Circle size={18} weight="fill" />
          ) : (
            <Circle size={18} weight="bold" />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
