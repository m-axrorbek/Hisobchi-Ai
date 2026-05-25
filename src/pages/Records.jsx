import { Fragment, useEffect, useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";
import ActionDialog from "../components/ActionDialog";
import DebtResolutionSheet from "../components/DebtResolutionSheet";
import FeedbackToast from "../components/FeedbackToast";
import ManualRecordSheet from "../components/ManualRecordSheet";
import RecordList from "../components/RecordList";
import RecordsToolsSheet from "../components/RecordsToolsSheet";
import { Button } from "../components/ui/button";
import { buildOverpaymentMessage } from "../lib/money/debts.js";
import { exportRecordsToCsv, exportRecordsToPrintableReport } from "../lib/money/export.js";
import { buildDailyExpenseSummary, getRecordsByFilter } from "../lib/money/analytics.js";
import { useMoneyStore } from "../store/useMoneyStore";

const FILTERS = [
  { key: "all", label: "Barchasi" },
  { key: "expense", label: "Xarajatlar" },
  { key: "debt_taken", label: "Qarz olganlarim" },
  { key: "debt_given", label: "Qarz berganlarim" },
  { key: "paid_debts", label: "Yopilgan qarzlar" },
  { key: "active_debts", label: "Faol qarzlar" }
];

const Records = () => {
  const records = useMoneyStore((state) => state.records);
  const archiveRecord = useMoneyStore((state) => state.archiveRecord);
  const restoreRecord = useMoneyStore((state) => state.restoreRecord);
  const deleteRecord = useMoneyStore((state) => state.deleteRecord);
  const openComposer = useMoneyStore((state) => state.openComposer);
  const markDebtPaid = useMoneyStore((state) => state.markDebtPaid);
  const applyDebtPayment = useMoneyStore((state) => state.applyDebtPayment);

  const [filter, setFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [dayFilter, setDayFilter] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [resolution, setResolution] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [dialogState, setDialogState] = useState(null);

  const typeFilteredRecords = useMemo(() => getRecordsByFilter(records, filter, showArchived), [filter, records, showArchived]);
  const filteredRecords = useMemo(
    () => (dayFilter ? typeFilteredRecords.filter((record) => record.date === dayFilter) : typeFilteredRecords),
    [dayFilter, typeFilteredRecords]
  );
  const dailyExpenseSummary = useMemo(() => buildDailyExpenseSummary(records).slice(0, 7), [records]);
  const hasToolsState = Boolean(dayFilter || showArchived);

  useEffect(() => {
    if (!feedback) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedback]);

  const handleSelectDay = (value) => {
    setDayFilter(value);
    setToolsOpen(false);
  };

  const handleClearDayFilter = () => {
    setDayFilter("");
    setToolsOpen(false);
  };

  const handleToggleArchived = () => {
    setShowArchived((current) => !current);
    setToolsOpen(false);
  };

  const handleExportCsv = () => {
    const result = exportRecordsToCsv(filteredRecords);
    if (!result?.ok) {
      setToolsOpen(false);
      setDialogState(buildExportDialog(result.code, "CSV"));
      return;
    }

    setFeedback({
      tone: "success",
      text: "CSV hisobot yuklandi."
    });
    setToolsOpen(false);
  };

  const handleExportPdf = () => {
    const result = exportRecordsToPrintableReport(filteredRecords);
    if (!result?.ok) {
      setToolsOpen(false);
      setDialogState(buildExportDialog(result.code, "PDF"));
      return;
    }

    setFeedback({
      tone: "success",
      text: "PDF hisobot oynasi ochildi."
    });
    setToolsOpen(false);
  };

  const handleRequestDelete = (record) => {
    setDialogState({
      mode: "delete",
      tone: "destructive",
      title: "Bu qaydni o'chirmoqchimisiz?",
      description: `"${record.item || "Yozuv"}" qaydi o'chiriladi. Bu amalni keyin ortga qaytarib bo'lmaydi.`,
      confirmLabel: "Ha, o'chirish",
      cancelLabel: "Bekor qilish",
      recordId: record.id
    });
  };

  const handleDialogConfirm = () => {
    if (dialogState?.mode === "delete" && dialogState.recordId) {
      deleteRecord(dialogState.recordId);
      setFeedback({
        tone: "warning",
        text: "Qayd o'chirildi."
      });
    }

    setDialogState(null);
  };

  return (
    <div className="space-y-6 pb-36">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <Fragment key={item.key}>
            <Button
              variant={filter === item.key ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setFilter(item.key)}
              aria-pressed={filter === item.key}
            >
              {item.label}
            </Button>
            {item.key === "active_debts" ? (
              <Button
                type="button"
                variant={toolsOpen || hasToolsState ? "default" : "outline"}
                size="icon"
                className="rounded-full"
                onClick={() => setToolsOpen(true)}
                aria-label="Kun filtri va eksport amallari"
                aria-haspopup="dialog"
                aria-expanded={toolsOpen}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            ) : null}
          </Fragment>
        ))}
      </div>

      <RecordList
        records={filteredRecords}
        emptyTitle={showArchived ? "Arxiv bo'sh" : "Yozuv topilmadi"}
        emptyHint={showArchived ? "Arxivlangan yozuvlar shu yerda ko'rinadi." : "Filter yoki kunni almashtirib ko'ring, yoki yangi yozuv qo'shing."}
        onEdit={(record) => openComposer(record, "edit")}
        onArchive={archiveRecord}
        onRestore={restoreRecord}
        onDelete={handleRequestDelete}
        onMarkPaid={(record) => markDebtPaid(record.id)}
        onPartialPayment={(debt) =>
          setResolution({
            mode: "partial_payment",
            title: "Qisman to'lov qo'shish",
            debt
          })
        }
      />

      <FeedbackToast feedback={feedback} />

      <ManualRecordSheet />
      <RecordsToolsSheet
        open={toolsOpen}
        onClose={() => setToolsOpen(false)}
        dayFilter={dayFilter}
        onSelectDay={handleSelectDay}
        onClearDayFilter={handleClearDayFilter}
        dailyExpenseSummary={dailyExpenseSummary}
        showArchived={showArchived}
        onToggleArchived={handleToggleArchived}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
      />
      <DebtResolutionSheet
        resolution={resolution}
        onClose={() => setResolution(null)}
        onConfirmFull={(debt) => {
          markDebtPaid(debt.id);
          setResolution(null);
        }}
        onConfirmPartial={(debt, amount) => {
          if (amount > Number(debt.remaining_amount || 0)) {
            setResolution({
              mode: "overpayment",
              title: "Ortiqcha to'lov",
              message: buildOverpaymentMessage(debt, amount),
              debt,
              draft: { amount }
            });
            return;
          }

          applyDebtPayment({
            debtId: debt.id,
            amount,
            note: "Qisman to'lov",
            sourceText: "Records sahifasidan qo'shildi"
          });
          setResolution(null);
        }}
      />
      <ActionDialog
        open={Boolean(dialogState)}
        tone={dialogState?.tone || "warning"}
        title={dialogState?.title || ""}
        description={dialogState?.description || ""}
        confirmLabel={dialogState?.confirmLabel || "Tushunarli"}
        cancelLabel={dialogState?.cancelLabel || "Bekor qilish"}
        showCancel={dialogState?.mode === "delete"}
        onConfirm={handleDialogConfirm}
        onClose={() => setDialogState(null)}
      />
    </div>
  );
};

export default Records;

const buildExportDialog = (code, formatName) => {
  if (code === "POPUP_BLOCKED") {
    return {
      mode: "notice",
      tone: "warning",
      title: `${formatName} oynasi ochilmadi`,
      description: "Brauzer yangi oynani bloklagan ko'rinadi. Popup ruxsatini yoqib, yana urinib ko'ring.",
      confirmLabel: "Tushundim"
    };
  }

  return {
    mode: "notice",
    tone: "warning",
    title: `${formatName} uchun yozuv topilmadi`,
    description: "Hisobot yuklashdan oldin kamida bitta yozuv qo'shing yoki filtrni bo'shating.",
    confirmLabel: "Tushundim"
  };
};
