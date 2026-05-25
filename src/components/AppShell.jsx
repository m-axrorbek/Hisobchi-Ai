import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronRight, LogOut, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import BottomDock from "./BottomDock";
import SettingsSheet from "./SettingsSheet";
import { useAuthStore } from "../store/useAuthStore";
import { useSettingsStore } from "../store/useSettingsStore";

const AppShell = ({ children, currentUser }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const title = getPageTitle(location.pathname, t);
  const logout = useAuthStore((state) => state.logout);
  const openSettings = useSettingsStore((state) => state.openSettings);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem("kotiba-theme");
    document.documentElement.lang = "uz";
    if (storedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

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
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-200 bg-white text-ink-900 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:hover:border-ink-500"
              aria-label="Profil menyusi"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ink-900 text-xs font-semibold text-white dark:bg-white dark:text-ink-900">
                {getInitials(currentUser?.name)}
              </span>
            </button>

            <div
              className={`absolute right-0 top-[calc(100%+0.75rem)] w-[19rem] origin-top-right rounded-[1.5rem] border border-ink-200 bg-white/96 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.14)] backdrop-blur transition-all duration-200 dark:border-ink-700 dark:bg-ink-900/96 ${
                profileMenuOpen
                  ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0"
              }`}
              role="menu"
              aria-hidden={!profileMenuOpen}
            >
              <div className="rounded-[1.2rem] bg-ink-50/90 px-4 py-3 dark:bg-ink-800/90">
                <p className="text-sm font-semibold text-ink-950 dark:text-ink-50">{currentUser?.name || "Foydalanuvchi"}</p>
                <p className="mt-1 break-all text-sm leading-5 text-ink-500 dark:text-ink-400">{currentUser?.email || ""}</p>
              </div>

              <div className="mt-2 space-y-1">
                <MenuButton
                  icon={<UserRound className="h-4 w-4" />}
                  label="Profil markazi"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    openSettings("profile", "profile");
                  }}
                />
                <MenuButton
                  icon={<LogOut className="h-4 w-4" />}
                  label="Chiqish"
                  destructive
                  onClick={() => {
                    setProfileMenuOpen(false);
                    logout();
                  }}
                />
              </div>
            </div>
          </div>
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

const MenuButton = ({ icon, label, onClick, destructive = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center justify-between rounded-[1.1rem] px-3 py-3 text-sm font-medium transition-colors ${
      destructive
        ? "text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
        : "text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
    }`}
    role="menuitem"
  >
    <span className="flex items-center gap-3">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-100">
        {icon}
      </span>
      {label}
    </span>
    {!destructive ? <ChevronRight className="h-4 w-4 text-ink-300 dark:text-ink-500" /> : null}
  </button>
);

const getInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
