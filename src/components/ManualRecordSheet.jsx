import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { format } from "date-fns";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { CATEGORY_OPTIONS } from "../lib/money/categories.js";
import { useMoneyStore } from "../store/useMoneyStore";
import { useAccessibleDialog } from "../hooks/useAccessibleDialog";
import { cn } from "../lib/utils";

const FIELD_ORDER = ["item", "amount", "quantity", "category", "person", "store", "date", "time", "payment_status", "paid_amount"];

const buildFormState = (draft = null) => {
  const now = new Date();
  const next = syncFormState({
    type: "expense",
    item: "",
    quantity: "1",
    unit_price: 0,
    amount: "",
    category: "boshqa",
    person: "",
    store: "",
    payment_status: "unpaid",
    paid_amount: "0",
    remaining_amount: "",
    date: format(now, "yyyy-MM-dd"),
    time: format(now, "HH:mm"),
    note: "",
    ...(draft || {})
  });

  return {
    ...next,
    quantity: stringifyFieldValue(next.quantity, "1"),
    amount: stringifyFieldValue(next.amount),
    paid_amount: stringifyFieldValue(next.paid_amount, isDebtType(next.type) ? "0" : ""),
    remaining_amount: stringifyFieldValue(next.remaining_amount),
    date: stringifyFieldValue(next.date, format(now, "yyyy-MM-dd")),
    time: stringifyFieldValue(next.time, format(now, "HH:mm")),
    item: stringifyFieldValue(next.item),
    category: stringifyFieldValue(next.category, "boshqa"),
    person: stringifyFieldValue(next.person),
    store: stringifyFieldValue(next.store),
    note: stringifyFieldValue(next.note),
    payment_status: stringifyFieldValue(next.payment_status, "unpaid")
  };
};

const ManualRecordSheet = () => {
  const composer = useMoneyStore((state) => state.composer);
  const saveRecord = useMoneyStore((state) => state.saveRecord);
  const closeComposer = useMoneyStore((state) => state.closeComposer);
  const [form, setForm] = useState(() => buildFormState());
  const [errors, setErrors] = useState({});
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

    setForm(buildFormState(composer.draft));
    setErrors({});
  }, [composer]);

  if (!composer.open) {
    return null;
  }

  const updateField = (key, value) => {
    setForm((current) => {
      const next = syncFormState({
        ...current,
        [key]: value
      });

      return {
        ...next,
        quantity: stringifyFieldValue(next.quantity, ""),
        amount: stringifyFieldValue(next.amount),
        paid_amount: stringifyFieldValue(next.paid_amount, isDebtType(next.type) ? "0" : ""),
        remaining_amount: stringifyFieldValue(next.remaining_amount)
      };
    });
    setErrors((current) => (current[key] ? { ...current, [key]: "" } : current));
  };

  const handleNumericField = (key, value) => {
    updateField(key, String(value || "").replace(/[^\d]/g, ""));
  };

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = validateForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstInvalidKey = FIELD_ORDER.find((key) => nextErrors[key]);
      if (firstInvalidKey) {
        window.requestAnimationFrame(() => {
          document.getElementById(getFieldIdMap(baseId)[firstInvalidKey])?.focus();
        });
      }
      return;
    }

    saveRecord(
      {
        ...form,
        quantity: Number(form.quantity || 0),
        amount: Number(form.amount || 0),
        paid_amount: isDebtType(form.type) ? Number(form.paid_amount || 0) : Number(form.amount || 0),
        remaining_amount: isDebtType(form.type) ? Number(form.remaining_amount || 0) : 0
      },
      { now: new Date() }
    );
  };

  const isDebt = form.type === "debt_taken" || form.type === "debt_given";
  const fieldIds = getFieldIdMap(baseId);
  const typeId = fieldIds.type;
  const itemId = fieldIds.item;
  const amountId = fieldIds.amount;
  const quantityId = fieldIds.quantity;
  const categoryId = fieldIds.category;
  const personId = fieldIds.person;
  const storeId = fieldIds.store;
  const dateId = fieldIds.date;
  const timeId = fieldIds.time;
  const paymentStatusId = fieldIds.payment_status;
  const paidAmountId = fieldIds.paid_amount;
  const noteId = fieldIds.note;

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
                  Izohdan tashqari barcha maydonlarni to'ldiring. Xarajat, qarz yoki daromad shu yerda aniq saqlanadi.
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
                <Field label="Yozuv turi" htmlFor={typeId} required error={errors.type}>
                  <SelectControl
                    id={typeId}
                    ref={typeRef}
                    value={form.type}
                    onChange={(event) => updateField("type", event.target.value)}
                    error={errors.type}
                    aria-invalid={Boolean(errors.type)}
                  >
                    <option value="expense">Xarajat</option>
                    <option value="debt_taken">Qarz oldim</option>
                    <option value="debt_given">Qarz berdim</option>
                    <option value="income">Daromad</option>
                  </SelectControl>
                </Field>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Nima oldingiz" htmlFor={itemId} required error={errors.item}>
                    <Input
                      id={itemId}
                      value={form.item}
                      onChange={(event) => updateField("item", event.target.value)}
                      placeholder="Nima oldingiz?"
                      aria-invalid={Boolean(errors.item)}
                      className={getInputClassName(errors.item)}
                    />
                  </Field>
                  <Field label="Summa" htmlFor={amountId} required error={errors.amount}>
                    <Input
                      id={amountId}
                      type="text"
                      inputMode="numeric"
                      value={form.amount}
                      onChange={(event) => handleNumericField("amount", event.target.value)}
                      placeholder="Summa"
                      aria-invalid={Boolean(errors.amount)}
                      className={getInputClassName(errors.amount)}
                    />
                  </Field>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Miqdor" htmlFor={quantityId} required error={errors.quantity}>
                    <Input
                      id={quantityId}
                      type="text"
                      inputMode="numeric"
                      value={form.quantity}
                      onChange={(event) => handleNumericField("quantity", event.target.value)}
                      placeholder="Miqdor"
                      aria-invalid={Boolean(errors.quantity)}
                      className={getInputClassName(errors.quantity)}
                    />
                  </Field>
                  <Field label="Kategoriya" htmlFor={categoryId} required error={errors.category}>
                    <SelectControl
                      id={categoryId}
                      value={form.category}
                      onChange={(event) => updateField("category", event.target.value)}
                      error={errors.category}
                      aria-invalid={Boolean(errors.category)}
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </SelectControl>
                  </Field>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Odam" htmlFor={personId} required error={errors.person}>
                    <Input
                      id={personId}
                      value={form.person}
                      onChange={(event) => updateField("person", event.target.value)}
                      placeholder="Odam"
                      aria-invalid={Boolean(errors.person)}
                      className={getInputClassName(errors.person)}
                    />
                  </Field>
                  <Field label="Do'kon" htmlFor={storeId} required error={errors.store}>
                    <Input
                      id={storeId}
                      value={form.store}
                      onChange={(event) => updateField("store", event.target.value)}
                      placeholder="Do'kon"
                      aria-invalid={Boolean(errors.store)}
                      className={getInputClassName(errors.store)}
                    />
                  </Field>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Sana" htmlFor={dateId} required error={errors.date}>
                    <Input
                      id={dateId}
                      type="date"
                      value={form.date}
                      onChange={(event) => updateField("date", event.target.value)}
                      aria-invalid={Boolean(errors.date)}
                      className={getInputClassName(errors.date)}
                    />
                  </Field>
                  <Field label="Vaqt" htmlFor={timeId} required error={errors.time}>
                    <Input
                      id={timeId}
                      type="time"
                      value={form.time}
                      onChange={(event) => updateField("time", event.target.value)}
                      aria-invalid={Boolean(errors.time)}
                      className={getInputClassName(errors.time)}
                    />
                  </Field>
                </div>

                {isDebt ? (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Field label="To'lov holati" htmlFor={paymentStatusId} required error={errors.payment_status}>
                      <SelectControl
                        id={paymentStatusId}
                        value={form.payment_status}
                        onChange={(event) => updateField("payment_status", event.target.value)}
                        error={errors.payment_status}
                        aria-invalid={Boolean(errors.payment_status)}
                      >
                        <option value="unpaid">To'lanmagan</option>
                        <option value="partial">Qisman to'langan</option>
                        <option value="paid">To'langan</option>
                      </SelectControl>
                    </Field>
                    <Field label="To'langan summa" htmlFor={paidAmountId} required error={errors.paid_amount}>
                      <Input
                        id={paidAmountId}
                        type="text"
                        inputMode="numeric"
                        value={form.paid_amount}
                        onChange={(event) => handleNumericField("paid_amount", event.target.value)}
                        placeholder="To'langan summa"
                        aria-invalid={Boolean(errors.paid_amount)}
                        className={getInputClassName(errors.paid_amount)}
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

export default ManualRecordSheet;

function Field({ label, htmlFor, children, error = "", required = false }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-600 dark:text-ink-300">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

const SelectControl = forwardRef(({ children, error = "", className = "", ...props }, ref) => (
  <div className="relative">
    <select ref={ref} className={cn(getInputClassName(error, { select: true }), className)} {...props}>
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 dark:text-ink-500"
      aria-hidden="true"
    />
  </div>
));
SelectControl.displayName = "SelectControl";

const getFieldIdMap = (baseId) => ({
  type: `${baseId}-type`,
  item: `${baseId}-item`,
  amount: `${baseId}-amount`,
  quantity: `${baseId}-quantity`,
  category: `${baseId}-category`,
  person: `${baseId}-person`,
  store: `${baseId}-store`,
  date: `${baseId}-date`,
  time: `${baseId}-time`,
  payment_status: `${baseId}-payment-status`,
  paid_amount: `${baseId}-paid-amount`,
  note: `${baseId}-note`
});

const isDebtType = (type) => type === "debt_taken" || type === "debt_given";

const syncFormState = (form) => {
  const amount = Math.max(Number(form.amount || 0) || 0, 0);
  const quantity = Math.max(Number(form.quantity || 0) || 0, 0);
  const next = {
    ...form,
    unit_price: quantity > 0 ? Math.round(amount / quantity) : amount
  };

  if (isDebtType(next.type)) {
    next.payment_status = next.payment_status || "unpaid";

    if (next.payment_status === "paid") {
      next.paid_amount = amount > 0 ? String(amount) : "";
      next.remaining_amount = "0";
      return next;
    }

    if (next.payment_status === "unpaid") {
      next.paid_amount = "0";
      next.remaining_amount = amount > 0 ? String(amount) : "";
      return next;
    }

    const paidAmount = Math.min(Math.max(Number(next.paid_amount || 0) || 0, 0), amount || Number.MAX_SAFE_INTEGER);
    next.paid_amount = paidAmount > 0 ? String(paidAmount) : "";
    next.remaining_amount = amount > 0 ? String(Math.max(amount - paidAmount, 0)) : "";
    return next;
  }

  next.payment_status = "paid";
  next.paid_amount = amount > 0 ? String(amount) : "";
  next.remaining_amount = "0";
  return next;
};

const validateForm = (form) => {
  const nextErrors = {};

  if (!String(form.item || "").trim()) {
    nextErrors.item = "Nima olinganini kiriting.";
  }
  if (!hasPositiveValue(form.amount)) {
    nextErrors.amount = "Summani kiriting.";
  }
  if (!hasPositiveValue(form.quantity)) {
    nextErrors.quantity = "Miqdorni kiriting.";
  }
  if (!String(form.category || "").trim()) {
    nextErrors.category = "Kategoriyani tanlang.";
  }
  if (!String(form.person || "").trim()) {
    nextErrors.person = "Odam maydonini to'ldiring.";
  }
  if (!String(form.store || "").trim()) {
    nextErrors.store = "Do'kon maydonini to'ldiring.";
  }
  if (!String(form.date || "").trim()) {
    nextErrors.date = "Sanani tanlang.";
  }
  if (!String(form.time || "").trim()) {
    nextErrors.time = "Vaqtni tanlang.";
  }

  if (isDebtType(form.type)) {
    if (!String(form.payment_status || "").trim()) {
      nextErrors.payment_status = "To'lov holatini tanlang.";
    }

    if (form.payment_status === "partial" && !hasPositiveValue(form.paid_amount)) {
      nextErrors.paid_amount = "Qisman to'langan summani kiriting.";
    }

    if (form.payment_status === "partial" && Number(form.paid_amount || 0) >= Number(form.amount || 0)) {
      nextErrors.paid_amount = "Qisman to'lov jami summadan kichik bo'lishi kerak.";
    }
  }

  return nextErrors;
};

const hasPositiveValue = (value) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) && numeric > 0;
};

const stringifyFieldValue = (value, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const getInputClassName = (error, options = {}) =>
  cn(
    "h-10 w-full rounded-xl border bg-white px-3 text-sm text-ink-900 shadow-none outline-none transition-[border-color,box-shadow,background-color] focus:border-ink-400 focus:ring-1 focus:ring-ink-300/45 dark:bg-black/20 dark:text-ink-100 dark:focus:border-white/35 dark:focus:ring-white/10",
    options.select && "appearance-none pr-10",
    error
      ? "border-red-300 focus:border-red-400 focus:ring-red-300/35 dark:border-red-500/70 dark:focus:border-red-400 dark:focus:ring-red-500/20"
      : "border-ink-200 hover:border-ink-300 dark:border-white/10 dark:hover:border-white/20"
  );
