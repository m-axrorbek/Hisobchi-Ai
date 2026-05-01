import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { formatMoney } from "../lib/money/format.js";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";

const DebtResolutionSheet = ({ resolution, onClose, onSelectDebt, onConfirmFull, onConfirmPartial }) => {
  const [manualAmount, setManualAmount] = useState("");
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef(null);
  const partialAmountRef = useRef(null);
  const initialFocusRef = resolution?.mode === "partial_payment" ? partialAmountRef : closeButtonRef;
  const { dialogRef } = useAccessibleDialog({
    open: Boolean(resolution),
    onClose,
    initialFocusRef
  });

  useEffect(() => {
    setManualAmount("");
  }, [resolution]);

  if (!resolution) {
    return null;
  }

  const content = (
    <div
      className="fixed inset-0 z-[78] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Yopish"
        tabIndex={-1}
      />
      <div className="relative grid min-h-screen place-items-center p-4 sm:p-6">
        <div ref={dialogRef} tabIndex={-1} className="relative z-10 w-full max-w-lg">
          <Card className="rounded-[2rem] shadow-[0_32px_90px_rgba(0,0,0,0.18)] dark:shadow-[0_32px_90px_rgba(0,0,0,0.55)]">
            <CardHeader className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle id={titleId} className="section-title">{resolution.title || "Qarzni aniqlashtirish"}</CardTitle>
                <p id={descriptionId} className="text-xs text-ink-500 dark:text-ink-400">
                  Davom etish uchun qarz bo'yicha kerakli variantni tanlang.
                </p>
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
            <CardContent className="space-y-4">
              {resolution.message ? (
                <div className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-700 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-200">
                  {resolution.message}
                </div>
              ) : null}

              {resolution.mode === "select_debt"
                ? resolution.candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => onSelectDebt?.(candidate)}
                      className="flex w-full items-center justify-between rounded-2xl border border-ink-200 px-4 py-3 text-left transition-colors hover:border-ink-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 dark:border-ink-700 dark:hover:border-ink-500"
                      aria-label={`${candidate.item}, ${candidate.person}, ${candidate.date} ${candidate.time}, qolgan qarz ${formatMoney(candidate.remaining_amount)}`}
                    >
                      <div>
                        <p className="font-semibold text-ink-950 dark:text-ink-50">{candidate.item}</p>
                        <p className="text-sm text-ink-500 dark:text-ink-400">
                          {candidate.person} / {candidate.date} {candidate.time}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-ink-900 dark:text-ink-100">
                        {formatMoney(candidate.remaining_amount)}
                      </span>
                    </button>
                  ))
                : null}

              {resolution.mode === "overpayment" ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 dark:border-ink-700 dark:bg-ink-950">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-ink-700 dark:text-ink-200" aria-hidden="true" />
                    <p className="text-sm text-ink-700 dark:text-ink-200">{resolution.message}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => onConfirmFull?.(resolution.debt, resolution.draft)}>Faqat qarzni yopish</Button>
                    <Button variant="outline" onClick={onClose}>
                      Bekor qilish
                    </Button>
                  </div>
                </div>
              ) : null}

              {resolution.mode === "partial_payment" ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 dark:border-ink-700 dark:bg-ink-950">
                    <p className="text-sm text-ink-700 dark:text-ink-200">
                      Qolgan qarz: <span className="font-semibold">{formatMoney(resolution.debt.remaining_amount)}</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="partial-payment-amount" className="text-xs font-medium text-ink-600 dark:text-ink-300">
                      To'lov summasi
                    </label>
                    <Input
                      id="partial-payment-amount"
                      ref={partialAmountRef}
                      type="number"
                      value={manualAmount}
                      onChange={(event) => setManualAmount(event.target.value)}
                      placeholder="To'lov summasi"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => onConfirmPartial?.(resolution.debt, Number(manualAmount || 0))}
                      disabled={!Number(manualAmount || 0)}
                    >
                      <CheckCircle2 className="h-4 w-4" /> To'lovni saqlash
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                      Bekor qilish
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default DebtResolutionSheet;
