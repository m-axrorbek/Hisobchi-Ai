
import { NavLink } from "react-router-dom";
import { Home, ReceiptText, BarChart3, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../store/useSettingsStore";

const navClass = ({ isActive }) =>
  isActive
    ? "rounded-full bg-ink-100 p-2.5 text-ink-900 dark:bg-ink-700 dark:text-white"
    : "rounded-full p-2.5 text-ink-500 transition-colors hover:text-ink-900 dark:text-ink-300 dark:hover:text-white";

const BottomDock = () => {
  const { t } = useTranslation();
  const openSettings = useSettingsStore((state) => state.openSettings);

  return (
    <div className="fixed bottom-4 left-0 right-0 z-30 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-[2rem] border border-ink-200 bg-white/92 px-4 py-3 shadow-lift backdrop-blur dark:border-ink-700/70 dark:bg-ink-900/88">
          <div className="flex items-center justify-center gap-3 rounded-full border border-ink-200 bg-white px-4 py-2 shadow-soft dark:border-ink-700 dark:bg-ink-800">
            <NavLink to="/" className={navClass} aria-label={t("home")}>
              <Home className="h-4 w-4" />
            </NavLink>
            <NavLink to="/xarajatlar" className={navClass} aria-label={t("records")}>
              <ReceiptText className="h-4 w-4" />
            </NavLink>
            <NavLink to="/analytics" className={navClass} aria-label={t("analytics")}>
              <BarChart3 className="h-4 w-4" />
            </NavLink>
            <button
              type="button"
              onClick={() => openSettings("appearance", "settings")}
              className="rounded-full p-2.5 text-ink-500 transition-colors hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
              aria-label={t("settings")}
              aria-haspopup="dialog"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomDock;
