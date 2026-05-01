import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Database, Volume2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import ThemeToggle from "./ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { hasUzbekVoiceKey, hasUzbekVoiceTtsKey } from "../lib/uzbekVoice";
import { useSettingsStore } from "../store/useSettingsStore";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";

const SettingsSheet = () => {
  const { t } = useTranslation();
  const settingsOpen = useSettingsStore((state) => state.settingsOpen);
  const closeSettings = useSettingsStore((state) => state.closeSettings);
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef(null);
  const { dialogRef } = useAccessibleDialog({
    open: settingsOpen,
    onClose: closeSettings,
    initialFocusRef: closeButtonRef
  });

  if (!settingsOpen) {
    return null;
  }

  const content = (
    <div
      className="fixed inset-0 z-[75] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={closeSettings}
        aria-label={t("close")}
        tabIndex={-1}
      />
      <div className="relative grid min-h-screen place-items-center p-4 sm:p-6">
        <div ref={dialogRef} tabIndex={-1} className="relative z-10 w-full max-w-md">
          <Card className="rounded-[2rem] shadow-[0_32px_90px_rgba(0,0,0,0.18)] dark:shadow-[0_32px_90px_rgba(0,0,0,0.55)]">
            <CardHeader className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle id={titleId} className="section-title">{t("settings")}</CardTitle>
                <p id={descriptionId} className="text-xs text-ink-500 dark:text-ink-400">
                  Ovoz, ko'rinish va tizim holatini shu yerda boshqaring.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeSettings}
                className="rounded-full p-2 text-ink-500 transition-colors hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-5">
              <InfoRow
                title="Offline saqlash"
                hint="Yozuvlar brauzer ichida saqlanadi va offline ko'rinadi."
                icon={<Database className="h-5 w-5 text-ink-400 dark:text-ink-500" aria-hidden="true" />}
              />

              <InfoRow
                title="UzbekVoice TTS"
                hint={hasUzbekVoiceTtsKey() ? t("lolaReady") : t("ttsMissing")}
                icon={<Volume2 className="h-5 w-5 text-ink-400 dark:text-ink-500" aria-hidden="true" />}
              />

              <InfoRow
                title="UzbekVoice STT"
                hint={hasUzbekVoiceKey() ? t("aiReady") : t("sttMissing")}
                icon={<Volume2 className="h-5 w-5 text-ink-400 dark:text-ink-500" aria-hidden="true" />}
              />

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{t("appearance")}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">{t("appearanceHint")}</p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

const InfoRow = ({ title, hint, icon }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="space-y-1">
      <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{title}</p>
      <p className="text-xs text-ink-500 dark:text-ink-400">{hint}</p>
    </div>
    {icon}
  </div>
);

export default SettingsSheet;
