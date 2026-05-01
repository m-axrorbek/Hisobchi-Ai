import { format, parseISO } from "date-fns";
import { v4 as uuid } from "uuid";
import { inferCategory } from "./categories.js";

export const RECORD_TYPES = ["expense", "debt_taken", "debt_given", "income", "debt_payment"];
export const DEBT_TYPES = ["debt_taken", "debt_given"];

export const isDebtRecord = (record) => DEBT_TYPES.includes(record?.type);
export const isPaymentRecord = (record) => record?.type === "debt_payment";
export const isExpenseRecord = (record) => record?.type === "expense";
export const isIncomeRecord = (record) => record?.type === "income";
export const isArchivedRecord = (record) => Boolean(record?.archived);

export const buildRecordDateTime = (record) => {
  if (!record?.date) {
    return new Date();
  }

  const isoLike = `${record.date}T${record.time || "00:00"}`;
  const parsed = new Date(isoLike);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const sortRecordsByDateDesc = (records) =>
  [...records].sort((left, right) => buildRecordDateTime(right) - buildRecordDateTime(left));

export const formatRecordStamp = (record) => format(buildRecordDateTime(record), "dd MMM, HH:mm");

export const createMoneyRecord = (input = {}, options = {}) => {
  const now = resolveInputDate(input.date, input.time, options.now);
  const lineItems = normalizeLineItems(input.line_items);
  const explicitLineItemTotal = sumLineItemAmounts(lineItems);
  const amount = toMoneyNumber(input.amount) || explicitLineItemTotal;
  const quantity = input.quantity ? Math.max(Number(input.quantity) || 1, 0) : lineItems.length || 1;
  const unitPrice = toMoneyNumber(input.unit_price) || (quantity > 0 ? Math.round(amount / quantity) : amount);
  const type = normalizeRecordType(input.type);
  const paidAmountBase = type === "debt_payment" ? amount : toMoneyNumber(input.paid_amount);
  const explicitRemainingAmount = toOptionalMoneyNumber(input.remaining_amount);
  const itemLabel = cleanText(input.item || lineItems[0]?.item || (lineItems.length > 1 ? `${lineItems.length} ta mahsulot` : getDefaultItem(type)));
  const paymentStatus = resolvePaymentStatus(type, input.payment_status, amount, paidAmountBase, explicitRemainingAmount);
  const remainingAmount = resolveRemainingAmount(type, amount, paidAmountBase, explicitRemainingAmount, paymentStatus);
  const paidAmount = resolvePaidAmount(type, amount, paidAmountBase, paymentStatus, remainingAmount);
  const textForCategory = [itemLabel, input.note, input.category, ...lineItems.map((lineItem) => lineItem.item)].filter(Boolean).join(" ");

  return {
    id: input.id || uuid(),
    type,
    item: itemLabel,
    quantity,
    unit: normalizeUnitValue(input.unit),
    unit_price: unitPrice,
    amount,
    line_items: lineItems,
    category: type === "debt_payment" ? "qarz" : inferCategory(textForCategory, input.category),
    person: cleanText(input.person),
    store: cleanText(input.store),
    currency: "UZS",
    payment_status: paymentStatus,
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    date: format(now, "yyyy-MM-dd"),
    time: format(now, "HH:mm"),
    note: cleanText(input.note),
    archived: Boolean(input.archived),
    created_at: input.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_text: cleanText(input.source_text)
  };
};

export const createDebtPaymentRecord = ({
  amount,
  person,
  note = "",
  debtId,
  direction = "outgoing",
  sourceText = "",
  now = new Date()
}) =>
  createMoneyRecord({
    type: "debt_payment",
    item: direction === "incoming" ? "qarz qaytdi" : "qarz to'lovi",
    amount,
    category: "qarz",
    person,
    payment_status: "paid",
    paid_amount: amount,
    remaining_amount: 0,
    note: [note, debtId ? `Debt #${debtId}` : ""].filter(Boolean).join(" | "),
    source_text: sourceText,
    date: format(now, "yyyy-MM-dd"),
    time: format(now, "HH:mm")
  });

export const summarizeCounterparty = (record) => record.person || record.store || "Noma'lum";

export const resolveActiveDebtStatus = (record) => {
  if (!isDebtRecord(record)) {
    return record.payment_status;
  }

  if (record.remaining_amount <= 0) {
    return "paid";
  }

  if (record.paid_amount > 0) {
    return "partial";
  }

  return "unpaid";
};

export const cloneWithDerivedDebtState = (record, overrides = {}) => {
  const next = {
    ...record,
    ...overrides
  };

  next.payment_status = resolveActiveDebtStatus(next);
  next.remaining_amount = Math.max((next.amount || 0) - (next.paid_amount || 0), 0);
  next.updated_at = new Date().toISOString();
  return next;
};

const resolveInputDate = (date, time, now = new Date()) => {
  if (!date) {
    return now;
  }

  const parsed = new Date(`${date}T${time || "00:00"}`);
  return Number.isNaN(parsed.getTime()) ? now : parsed;
};

const normalizeRecordType = (type) => {
  if (RECORD_TYPES.includes(type)) {
    return type;
  }
  return "expense";
};

const resolvePaymentStatus = (type, paymentStatus, amount, paidAmount, remainingAmount) => {
  if (type === "expense" || type === "income" || type === "debt_payment") {
    return "paid";
  }

  if (paymentStatus === "paid") {
    return "paid";
  }

  if (amount > 0 && (paidAmount || 0) >= amount) {
    return "paid";
  }

  if (amount > 0 && typeof remainingAmount === "number" && remainingAmount <= 0) {
    return "paid";
  }

  if (paymentStatus === "partial") {
    return "partial";
  }

  if ((paidAmount || 0) > 0 && (paidAmount || 0) < amount) {
    return "partial";
  }

  return "unpaid";
};

const resolveRemainingAmount = (type, amount, paidAmount, remainingAmount, paymentStatus) => {
  if (!isDebtRecord({ type })) {
    return 0;
  }

  if (paymentStatus === "paid") {
    return 0;
  }

  if (typeof remainingAmount === "number" && !Number.isNaN(remainingAmount)) {
    return Math.max(remainingAmount, 0);
  }

  return Math.max(amount - (paidAmount || 0), 0);
};

const resolvePaidAmount = (type, amount, paidAmount, paymentStatus, remainingAmount) => {
  if (type === "debt_payment") {
    return amount;
  }

  if (type === "expense" || type === "income") {
    return amount;
  }

  if (paymentStatus === "paid") {
    return amount;
  }

  if (typeof paidAmount === "number" && !Number.isNaN(paidAmount)) {
    return Math.max(paidAmount, 0);
  }

  return Math.max(amount - (remainingAmount || 0), 0);
};

const toMoneyNumber = (value) => {
  const number = Number(value || 0);
  return Number.isNaN(number) ? 0 : Math.max(Math.round(number), 0);
};

const toOptionalMoneyNumber = (value) => {
  if (value === "" || value == null) {
    return null;
  }

  const number = Number(value);
  return Number.isNaN(number) ? null : Math.max(Math.round(number), 0);
};

const normalizeLineItems = (lineItems) =>
  Array.isArray(lineItems)
    ? lineItems
        .map((lineItem) => ({
          item: cleanText(lineItem?.item),
          quantity: Math.max(Number(lineItem?.quantity || 1) || 1, 1),
          amount: toOptionalMoneyNumber(lineItem?.amount),
          unit_price: toOptionalMoneyNumber(lineItem?.unit_price)
        }))
        .filter((lineItem) => Boolean(lineItem.item))
    : [];

const sumLineItemAmounts = (lineItems) =>
  lineItems.reduce((total, lineItem) => total + (typeof lineItem.amount === "number" ? lineItem.amount : 0), 0);

const cleanText = (value) => String(value || "").trim();

const normalizeUnitValue = (value) => {
  const text = cleanText(value);
  return text || null;
};

const getDefaultItem = (type) => {
  if (type === "debt_taken") return "qarz oldim";
  if (type === "debt_given") return "qarz berdim";
  if (type === "income") return "daromad";
  if (type === "debt_payment") return "qarz to'lovi";
  return "xarajat";
};
