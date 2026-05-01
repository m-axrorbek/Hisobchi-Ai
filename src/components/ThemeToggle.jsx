import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

const applyTheme = (isDark) => {
  if (isDark) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("kotiba-theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("kotiba-theme", "light");
  }
};

export default function ThemeToggle() {
  const { t } = useTranslation();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("kotiba-theme");
    const nextIsDark = storedTheme === "dark";
    setIsDark(nextIsDark);
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    applyTheme(nextIsDark);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center justify-center rounded-full border border-ink-200 bg-white/80 p-2 text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700 dark:hover:text-white"
      aria-label={t("toggleTheme")}
      aria-pressed={isDark}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
