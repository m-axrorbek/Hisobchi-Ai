import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info, Trash2, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";

const TONE_STYLES = {
  info: {
    icon: Info,
    chip: "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-100",
    border: "border-ink-200 dark:border-ink-700"
  },
  warning: {
    icon: AlertTriangle,
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
    border: "border-amber-200 dark:border-amber-500/40"
  },
  destructive: {
    icon: Trash2,
    chip: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200",
    border: "border-red-200 dark:border-red-500/40"
  }
};

const ActionDialog = ({
  open,
  tone = "warning",
  title,
  description,
  confirmLabel = "Tushunarli",
  cancelLabel = "Bekor qilish",
  showCancel = false,
  onConfirm,
  onClose
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const confirmButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const activeTone = TONE_STYLES[tone] || TONE_STYLES.warning;
  const Icon = activeTone.icon;
  const { dialogRef } = useAccessibleDialog({
    open,
    onClose,
    initialFocusRef: showCancel ? closeButtonRef : confirmButtonRef
  });

  if (!open) {
    return null;
  }

  const content = (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
        onClick={onClose}
        aria-label="Yopish"
        tabIndex={-1}
      />
      <div className="relative grid min-h-screen place-items-center p-4 sm:p-6">
        <div ref={dialogRef} tabIndex={-1} className="relative z-10 w-full max-w-md">
          <Card className={`rounded-[2rem] border bg-white/96 shadow-[0_32px_90px_rgba(0,0,0,0.2)] dark:bg-ink-900/96 ${activeTone.border}`}>
            <CardHeader className="flex items-start justify-between gap-3">
              <div className="space-y-3">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${activeTone.chip}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <CardTitle id={titleId} className="section-title text-lg">
                    {title}
                  </CardTitle>
                  <p id={descriptionId} className="text-sm leading-6 text-ink-600 dark:text-ink-300">
                    {description}
                  </p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-ink-500 transition-colors hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
                aria-label="Yopish"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="flex items-center justify-end gap-2">
              {showCancel ? (
                <Button type="button" variant="outline" onClick={onClose}>
                  {cancelLabel}
                </Button>
              ) : null}
              <Button
                ref={confirmButtonRef}
                type="button"
                variant={tone === "destructive" ? "destructive" : "default"}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default ActionDialog;
