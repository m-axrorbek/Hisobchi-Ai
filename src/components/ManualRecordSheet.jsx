import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { CATEGORY_OPTIONS } from "../lib/money/categories.js";
import { useMoneyStore } from "../store/useMoneyStore";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";

const EMPTY_FORM = {
  type: "expense",
  item: "",
  quantity: 1,
  unit_price: 0,
  amount: "",
  category: "boshqa",
  person: "",
  store: "",
  payment_status: "unpaid",
  paid_amount: "",
  remaining_amount: "",
  date: "",
  time: "",
  note: ""
};

const ManualRecordSheet = () => {
  const composer = useMoneyStore((state) => state.composer);
  const saveRecord = useMoneyStore((state) => state.saveRecord);
  const closeComposer = useMoneyStore((state) => state.closeComposer);
  const [form, setForm] = useState(EMPTY_FORM);
  const titleId = useId();
  const descriptionId = useId();
  const baseId = useId();
  const typeRef = useRef(null);
  const { dialogRef } = useAccessibleDialog({
    open: composer.open,
    onClose: closeComposer,
    initialFocusRef: typeRef
  });

  useEffect(() => {
    if (!composer.open) {
      return;
    }

    setForm({
      ...EMPTY_FORM,
      ...composer.draft
    });
  }, [composer]);

  if (!composer.open) {
    return null;
  }

  const updateField = (key, value) => {
    setForm((current) => {
      const next = {
        ...current,
        [key]: value
      };

      if (key === "amount" || key === "quantity") {
        const amount = Number(key === "amount" ? value : next.amount) || 0;
        const quantity = Number(key === "quantity" ? value : next.quantity) || 1;
        next.unit_price = quantity > 0 ? Math.round(amount / quantity) : amount;
      }

      return next;
    });
  };

  const handleNumericField = (key, value) => {
    updateField(key, String(value || "").replace(/[^\d]/g, ""));
  };

  const submit = (event) => {
    event.preventDefault();
    saveRecord(form, { now: new Date() });
  };

  const isDebt = form.type === "debt_taken" || form.type === "debt_given";
  const typeId = `${baseId}-type`;
  const itemId = `${baseId}-item`;
  const amountId = `${baseId}-amount`;
  const quantityId = `${baseId}-quantity`;
  const categoryId = `${baseId}-category`;
  const personId = `${baseId}-person`;
  const storeId = `${baseId}-store`;
  const dateId = `${baseId}-date`;
  const timeId = `${baseId}-time`;
  const paymentStatusId = `${baseId}-payment-status`;
  const paidAmountId = `${baseId}-paid-amount`;
  const noteId = `${baseId}-note`;

  const content = (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={closeComposer}
        aria-label="Yopish"
        tabIndex={-1}
      />
      <div className="relative grid min-h-screen place-items-center p-4 sm:p-6">
        <div ref={dialogRef} tabIndex={-1} className="relative z-10 w-full max-w-lg">
          <Card className="max-h-[calc(100vh-2rem)] rounded-[2rem] shadow-[0_32px_90px_rgba(0,0,0,0.18)] dark:shadow-[0_32px_90px_rgba(0,0,0,0.55)]">
            <CardHeader className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle id={titleId} className="section-title text-[1.05rem]">
                  {composer.mode === "edit" ? "Yozuvni tahrirlash" : "Qo'lda yozuv qo'shish"}
                </CardTitle>
                <p id={descriptionId} className="text-xs text-ink-500 dark:text-ink-400">
                  Xarajat, qarz yoki daromadni qo'lda aniq maydonlar orqali kiriting.
                </p>
              </div>
              <button
                type="button"
                onClick={closeComposer}
                className="rounded-full p-2 text-ink-500 transition-colors hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
                aria-label="Yopish"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="max-h-[calc(100vh-10rem)] overflow-y-auto">
              <form className="grid gap-2.5" onSubmit={submit}>
                <Field label="Yozuv turi" htmlFor={typeId}>
                  <select
                    id={typeId}
                    ref={typeRef}
                    value={form.type}
                    onChange={(event) => updateField("type", event.target.value)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
                  >
                    <option value="expense">Xarajat</option>
                    <option value="debt_taken">Qarz oldim</option>
                    <option value="debt_given">Qarz berdim</option>
                    <option value="income">Daromad</option>
                  </select>
                </Field>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Nima oldingiz" htmlFor={itemId}>
                    <Input id={itemId} value={form.item} onChange={(event) => updateField("item", event.target.value)} placeholder="Nima oldingiz?" />
                  </Field>
                  <Field label="Summa" htmlFor={amountId}>
                    <Input
                      id={amountId}
                      type="text"
                      inputMode="numeric"
                      value={form.amount}
                      onChange={(event) => handleNumericField("amount", event.target.value)}
                      placeholder="Summa"
                    />
                  </Field>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Miqdor" htmlFor={quantityId}>
                    <Input
                      id={quantityId}
                      type="text"
                      inputMode="numeric"
                      value={form.quantity}
                      onChange={(event) => handleNumericField("quantity", event.target.value)}
                      placeholder="Miqdor"
                    />
                  </Field>
                  <Field label="Kategoriya" htmlFor={categoryId}>
                    <select
                      id={categoryId}
                      value={form.category}
                      onChange={(event) => updateField("category", event.target.value)}
                      className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Odam" htmlFor={personId}>
                    <Input id={personId} value={form.person} onChange={(event) => updateField("person", event.target.value)} placeholder="Odam" />
                  </Field>
                  <Field label="Do'kon" htmlFor={storeId}>
                    <Input id={storeId} value={form.store} onChange={(event) => updateField("store", event.target.value)} placeholder="Do'kon" />
                  </Field>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Sana" htmlFor={dateId}>
                    <Input id={dateId} type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} />
                  </Field>
                  <Field label="Vaqt" htmlFor={timeId}>
                    <Input id={timeId} type="time" value={form.time} onChange={(event) => updateField("time", event.target.value)} />
                  </Field>
                </div>

                {isDebt ? (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Field label="To'lov holati" htmlFor={paymentStatusId}>
                      <select
                        id={paymentStatusId}
                        value={form.payment_status}
                        onChange={(event) => updateField("payment_status", event.target.value)}
                        className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
                      >
                        <option value="unpaid">To'lanmagan</option>
                        <option value="partial">Qisman to'langan</option>
                        <option value="paid">To'langan</option>
                      </select>
                    </Field>
                    <Field label="To'langan summa" htmlFor={paidAmountId}>
                      <Input
                        id={paidAmountId}
                        type="text"
                        inputMode="numeric"
                        value={form.paid_amount}
                        onChange={(event) => handleNumericField("paid_amount", event.target.value)}
                        placeholder="To'langan summa"
                      />
                    </Field>
                  </div>
                ) : null}

                <Field label="Izoh" htmlFor={noteId}>
                  <Textarea
                    id={noteId}
                    value={form.note}
                    onChange={(event) => updateField("note", event.target.value)}
                    rows={3}
                    className="min-h-[112px]"
                    placeholder="Izoh"
                  />
                </Field>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button type="button" size="sm" variant="outline" onClick={closeComposer}>
                    Bekor qilish
                  </Button>
                  <Button type="submit" size="sm">
                    {composer.mode === "edit" ? "Saqlash" : "Yozuv qo'shish"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

const Field = ({ label, htmlFor, children }) => (
  <div className="space-y-1">
    <label htmlFor={htmlFor} className="text-xs font-medium text-ink-600 dark:text-ink-300">
      {label}
    </label>
    {children}
  </div>
);

export default ManualRecordSheet;
