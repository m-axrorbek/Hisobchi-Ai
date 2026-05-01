import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BottomDock from "./BottomDock";
import SettingsSheet from "./SettingsSheet";

const AppShell = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const title = getPageTitle(location.pathname, t);

  useEffect(() => {
    const storedTheme = localStorage.getItem("kotiba-theme");
    document.documentElement.lang = "uz";
    if (storedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-300">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[90] rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only dark:bg-ink-100 dark:text-ink-900"
      >
        {t("skipToContent")}
      </a>
      <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-white/90 backdrop-blur dark:border-ink-800 dark:bg-black/95 dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-ink-900 dark:bg-white" />
            <span className="text-sm font-semibold text-ink-950 dark:text-white">
              {title}
            </span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-600 dark:text-white/85">
            HISOBCHI AI
          </span>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 transition-opacity duration-500 sm:px-6 sm:pt-8">
        {children}
      </main>

      <BottomDock />
      <SettingsSheet />
    </div>
  );
};

const getPageTitle = (pathname, t) => {
  if (pathname === "/xarajatlar") {
    return t("records");
  }
  if (pathname === "/analytics") {
    return t("analytics");
  }

  return t("home");
};

export default AppShell;
