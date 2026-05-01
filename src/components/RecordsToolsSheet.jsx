import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, FolderArchive, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { formatMoney } from "../lib/money/format.js";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";

const RecordsToolsSheet = ({
  open,
  onClose,
  dayFilter,
  onSelectDay,
  onClearDayFilter,
  dailyExpenseSummary,
  showArchived,
  onToggleArchived,
  onExportCsv,
  onExportPdf
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const dayInputId = useId();
  const closeButtonRef = useRef(null);
  const { dialogRef } = useAccessibleDialog({
    open,
    onClose,
    initialFocusRef: closeButtonRef
  });

  if (!open) {
    return null;
  }

  const content = (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Yopish"
        tabIndex={-1}
      />
      <div className="relative grid min-h-screen place-items-center p-4 sm:p-6">
        <div ref={dialogRef} tabIndex={-1} className="relative z-10 w-full max-w-md">
          <Card className="max-h-[calc(100vh-2rem)] rounded-[2rem] shadow-[0_32px_90px_rgba(0,0,0,0.18)] dark:shadow-[0_32px_90px_rgba(0,0,0,0.55)]">
            <CardHeader className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle id={titleId} className="section-title">Ko'rinish va eksport</CardTitle>
                <p id={descriptionId} className="text-xs text-ink-500 dark:text-ink-400">Kun filtri, arxiv va hisobotlar shu yerda.</p>
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

            <CardContent className="max-h-[calc(100vh-10rem)] space-y-5 overflow-y-auto">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">Kunlar</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={!dayFilter ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={onClearDayFilter}
                    aria-pressed={!dayFilter}
                  >
                    Barcha kunlar
                  </Button>
                  {dailyExpenseSummary.map((item) => (
                    <Button
                      key={item.date}
                      variant={dayFilter === item.date ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => onSelectDay(item.date)}
                      aria-pressed={dayFilter === item.date}
                    >
                      {item.label}: {formatMoney(item.amount)}
                    </Button>
                  ))}
                </div>
                <div className="space-y-1">
                  <label htmlFor={dayInputId} className="text-xs font-medium text-ink-600 dark:text-ink-300">
                    Sana bo'yicha filter
                  </label>
                  <Input id={dayInputId} type="date" value={dayFilter} onChange={(event) => onSelectDay(event.target.value)} className="h-10" />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">Amallar</p>
                <div className="grid gap-2">
                  <Button
                    variant={showArchived ? "default" : "outline"}
                    className="justify-start"
                    onClick={onToggleArchived}
                    aria-pressed={showArchived}
                  >
                    <FolderArchive className="h-4 w-4" /> {showArchived ? "Arxiv ko'rinmoqda" : "Arxivni ko'rsatish"}
                  </Button>
                  <Button variant="outline" className="justify-start" onClick={onExportCsv}>
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                  <Button variant="outline" className="justify-start" onClick={onExportPdf}>
                    <FileText className="h-4 w-4" /> PDF hisobot
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default RecordsToolsSheet;
