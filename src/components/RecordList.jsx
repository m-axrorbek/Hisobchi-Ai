import { Archive, CheckCircle2, Pencil, RotateCcw, Trash2, Wallet } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { formatMoney } from "../lib/money/format.js";
import { formatRecordStamp, isDebtRecord } from "../lib/money/records.js";

const RecordList = ({
  records,
  emptyTitle,
  emptyHint,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onMarkPaid,
  onPartialPayment,
  compact = false
}) => {
  if (!records.length) {
    return (
      <Card className="border-dashed bg-transparent dark:border-ink-700">
        <CardContent className="py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 dark:bg-ink-800">
            <Wallet className="h-5 w-5 text-ink-500 dark:text-ink-300" />
          </div>
          <p className="mt-4 text-base font-semibold text-ink-900 dark:text-ink-100">{emptyTitle}</p>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{emptyHint}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {records.map((record) => {
        const isDebt = isDebtRecord(record);
        const partner = record.person || record.store || "Noma'lum";
        const lineItems = Array.isArray(record.line_items) ? record.line_items.filter((entry) => entry?.item) : [];
        const hasGroupedItems = lineItems.length > 1;
        const showActiveActions = !record.archived && (onEdit || onArchive || onDelete || onMarkPaid || onPartialPayment);
        const showArchivedActions = record.archived && (onRestore || onDelete);

        return (
          <Card key={record.id} className={record.archived ? "opacity-70" : ""}>
            <CardContent className={`${compact ? "p-4" : "p-5"} space-y-3`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-ink-950 dark:text-ink-50">
                    {hasGroupedItems ? `${lineItems.length} ta mahsulot` : record.item}
                  </p>
                  <p className="text-sm text-ink-500 dark:text-ink-400">{partner} / {record.category} / {record.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-ink-950 dark:text-ink-50">{formatMoney(record.amount, record.currency)}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">{formatRecordStamp(record)}</p>
                </div>
              </div>

              {hasGroupedItems ? (
                <div className="rounded-2xl border border-ink-200/80 bg-ink-50/70 p-3 dark:border-ink-800 dark:bg-ink-900/60">
                  <div className="space-y-2">
                    {lineItems.map((lineItem, index) => (
                      <div key={`${record.id}-line-item-${index}`} className="flex items-center justify-between gap-3 text-sm">
                        <p className="text-ink-700 dark:text-ink-200">{formatLineItemLabel(lineItem)}</p>
                        <p className="text-right font-medium text-ink-900 dark:text-ink-50">
                          {hasLineItemAmount(lineItem) ? formatMoney(lineItem.amount, record.currency) : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-ink-200/80 pt-3 text-sm dark:border-ink-800">
                    <p className="font-medium text-ink-600 dark:text-ink-300">Jami</p>
                    <p className="font-semibold text-ink-950 dark:text-ink-50">{formatMoney(record.amount, record.currency)}</p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2 text-sm text-ink-600 dark:text-ink-300 sm:grid-cols-2">
                <p>{hasGroupedItems ? "Mahsulotlar" : "Miqdor"}: {hasGroupedItems ? lineItems.length : record.quantity}</p>
                <p>Holat: {record.payment_status}</p>
                <p>To'langan: {formatMoney(record.paid_amount, record.currency)}</p>
                <p>Qolgan: {formatMoney(record.remaining_amount, record.currency)}</p>
              </div>

              {record.note ? <p className="text-sm text-ink-500 dark:text-ink-400">{record.note}</p> : null}

              {showActiveActions || showArchivedActions ? (
                <div className="flex flex-wrap items-center gap-2">
                  {!record.archived ? (
                    <>
                      {onEdit ? (
                        <Button size="sm" variant="outline" onClick={() => onEdit(record)}>
                          <Pencil className="h-4 w-4" /> Tahrirlash
                        </Button>
                      ) : null}
                      {onArchive ? (
                        <Button size="sm" variant="outline" onClick={() => onArchive(record.id)}>
                          <Archive className="h-4 w-4" /> Arxivlash
                        </Button>
                      ) : null}
                      {isDebt && record.payment_status !== "paid" && onPartialPayment ? (
                        <Button size="sm" variant="outline" onClick={() => onPartialPayment(record)}>
                          <Wallet className="h-4 w-4" /> Qisman to'lash
                        </Button>
                      ) : null}
                      {isDebt && record.payment_status !== "paid" && onMarkPaid ? (
                        <Button size="sm" onClick={() => onMarkPaid(record)}>
                          <CheckCircle2 className="h-4 w-4" /> Yopildi
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button size="sm" variant="ghost" onClick={() => onDelete(record.id)}>
                          <Trash2 className="h-4 w-4" /> O'chirish
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {onRestore ? (
                        <Button size="sm" variant="outline" onClick={() => onRestore(record.id)}>
                          <RotateCcw className="h-4 w-4" /> Tiklash
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button size="sm" variant="ghost" onClick={() => onDelete(record.id)}>
                          <Trash2 className="h-4 w-4" /> Butunlay o'chirish
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RecordList;

const hasLineItemAmount = (lineItem) => typeof lineItem?.amount === "number" && lineItem.amount > 0;

const formatLineItemLabel = (lineItem) => {
  const quantity = Math.max(Number(lineItem?.quantity || 1) || 1, 1);
  const item = String(lineItem?.item || "").trim();
  return quantity > 1 ? `${quantity} ta ${item}` : item;
};
