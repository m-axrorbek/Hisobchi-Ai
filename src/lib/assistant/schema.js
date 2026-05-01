import { v4 as uuid } from "uuid";
import { inferCategory, normalizeCategory } from "../money/categories.js";

export const ASSISTANT_RECORD_TYPES = ["expense", "income", "debt_taken", "debt_given", "debt_payment"];
export const ASSISTANT_RESULT_INTENTS = [...ASSISTANT_RECORD_TYPES, "mixed", "unknown"];
export const ASSISTANT_UNITS = ["kg", "gramm", "litr", "ml", "dona", "paket", "quti", "butilka", "banka", "bog'lam", "dasta", "other"];

const UNIT_ALIASES = {
  kg: "kg",
  kilo: "kg",
  kilogram: "kg",
  gramm: "gramm",
  gram: "gramm",
  g: "gramm",
  litr: "litr",
  l: "litr",
  ml: "ml",
  millilitr: "ml",
  dona: "dona",
  ta: "dona",
  paket: "paket",
  pachka: "paket",
  quti: "quti",
  karobka: "quti",
  butilka: "butilka",
  banka: "banka",
  "bog'lam": "bog'lam",
  boglam: "bog'lam",
  dasta: "dasta"
};

const DEFAULT_UNKNOWN_QUESTION = "Qisqacha aniqroq yozib yuboring.";

export const buildUnknownAssistantResult = (question = DEFAULT_UNKNOWN_QUESTION) => ({
  intent: "unknown",
  needs_confirmation: true,
  question: String(question || DEFAULT_UNKNOWN_QUESTION).trim(),
  records: []
});

export const normalizeAssistantUnit = (value) => {
  const normalized = normalizeLooseWord(value);
  if (!normalized) {
    return null;
  }

  if (UNIT_ALIASES[normalized]) {
    return UNIT_ALIASES[normalized];
  }

  return ASSISTANT_UNITS.includes(normalized) ? normalized : null;
};

export const normalizeAssistantIntent = (intent, records = []) => {
  const normalizedIntent = String(intent || "").trim().toLowerCase();
  if (normalizedIntent === "unknown") {
    return "unknown";
  }

  const uniqueTypes = Array.from(new Set((Array.isArray(records) ? records : []).map((record) => record?.type).filter(Boolean)));
  if (uniqueTypes.length > 1) {
    return "mixed";
  }
  if (uniqueTypes.length === 1) {
    return uniqueTypes[0];
  }

  return ASSISTANT_RESULT_INTENTS.includes(normalizedIntent) ? normalizedIntent : "unknown";
};

export const normalizeAssistantRecord = (input = {}, options = {}) => {
  const now = options.now instanceof Date ? new Date(options.now) : new Date();
  const nowIso = now.toISOString();
  const type = normalizeRecordType(input.type ?? options.fallbackType);

  if (!type) {
    return null;
  }

  const amount = normalizeAmount(input.amount, type);
  if (amount == null) {
    return null;
  }

  const fallbackDate = normalizeDateString(options.fallbackDate, formatDate(now));
  const fallbackTime = normalizeTimeString(options.fallbackTime, formatTime(now));
  const quantity = normalizeOptionalPositiveNumber(input.quantity);
  const unit = normalizeAssistantUnit(input.unit);
  const unitPrice = resolveUnitPrice(input.unit_price, quantity, amount);
  const item = cleanNullableText(input.item ?? options.fallbackItem ?? null);
  const person = cleanNullableText(input.person ?? options.fallbackPerson ?? null);
  const store = cleanNullableText(input.store ?? options.fallbackStore ?? null);
  const note = cleanNullableText(input.note ?? options.fallbackNote ?? null);
  const category = resolveCategory(type, input.category, [item, note].filter(Boolean).join(" "));
  const payment = resolvePaymentMeta(type, amount, input.payment_status, input.paid_amount, input.remaining_amount);
  const createdAt = normalizeIsoString(input.created_at || options.createdAt || nowIso, nowIso);
  const updatedAt = normalizeIsoString(input.updated_at || options.updatedAt || createdAt, createdAt);

  return {
    id: cleanText(input.id) || uuid(),
    type,
    item,
    quantity,
    unit,
    unit_price: unitPrice,
    amount,
    category,
    person,
    store,
    currency: "UZS",
    payment_status: payment.payment_status,
    paid_amount: payment.paid_amount,
    remaining_amount: payment.remaining_amount,
    date: normalizeDateString(input.date, fallbackDate),
    time: normalizeTimeString(input.time, fallbackTime),
    note,
    archived: false,
    created_at: createdAt,
    updated_at: updatedAt
  };
};

export const normalizeAssistantPayload = (payload, options = {}) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const now = options.now instanceof Date ? new Date(options.now) : new Date();

  if (payload.intent === "unknown" || payload.needs_confirmation === true) {
    return buildUnknownAssistantResult(payload.question || DEFAULT_UNKNOWN_QUESTION);
  }

  const recordsSource = Array.isArray(payload.records) ? payload.records : payload.type ? [payload] : [];
  if (!recordsSource.length) {
    return buildUnknownAssistantResult(payload.question || DEFAULT_UNKNOWN_QUESTION);
  }

  const fallbackType = normalizeRecordType(payload.type || payload.intent);
  const normalizedRecords = [];
  let carry = {
    date: normalizeDateString(payload.date, formatDate(now)),
    time: normalizeTimeString(payload.time, formatTime(now)),
    person: cleanNullableText(payload.person),
    store: cleanNullableText(payload.store),
    type: fallbackType
  };

  for (const sourceRecord of recordsSource) {
    const normalizedRecord = normalizeAssistantRecord(sourceRecord, {
      now,
      fallbackType: sourceRecord?.type || carry.type,
      fallbackDate: sourceRecord?.date || carry.date,
      fallbackTime: sourceRecord?.time || carry.time,
      fallbackPerson: sourceRecord?.person || carry.person,
      fallbackStore: sourceRecord?.store || carry.store,
      fallbackNote: sourceRecord?.note || null
    });

    if (!normalizedRecord) {
      return buildUnknownAssistantResult(payload.question || DEFAULT_UNKNOWN_QUESTION);
    }

    normalizedRecords.push(normalizedRecord);
    carry = {
      date: normalizedRecord.date,
      time: normalizedRecord.time,
      person: normalizedRecord.person,
      store: normalizedRecord.store,
      type: normalizedRecord.type
    };
  }

  const validationQuestion = validateAssistantRecords(normalizedRecords);
  if (validationQuestion) {
    return buildUnknownAssistantResult(validationQuestion);
  }

  return {
    intent: normalizeAssistantIntent(payload.intent, normalizedRecords),
    needs_confirmation: false,
    question: null,
    records: normalizedRecords
  };
};

const validateAssistantRecords = (records) => {
  for (const record of records) {
    if (record.type === "debt_payment" && !record.person) {
      return "Kimga yoki kimdan qarz to'langanini yozing.";
    }

    if (record.amount !== "full" && !isPositiveNumber(record.amount)) {
      return record.type === "income" ? "Daromad summasini yozing." : "Summani aniqroq yozib yuboring.";
    }
  }

  return "";
};

const normalizeRecordType = (type) => {
  const normalized = String(type || "").trim().toLowerCase();
  return ASSISTANT_RECORD_TYPES.includes(normalized) ? normalized : "";
};

const normalizeAmount = (value, type) => {
  if (type === "debt_payment" && String(value || "").trim().toLowerCase() === "full") {
    return "full";
  }

  const numeric = toOptionalMoneyNumber(value);
  return numeric == null ? null : numeric;
};

const resolveUnitPrice = (unitPrice, quantity, amount) => {
  const explicit = toOptionalMoneyNumber(unitPrice);
  if (explicit != null) {
    return explicit;
  }

  if (!isPositiveNumber(quantity) || typeof amount !== "number" || amount <= 0) {
    return null;
  }

  return Math.round(amount / quantity);
};

const resolveCategory = (type, explicitCategory, text) => {
  if (type === "debt_taken" || type === "debt_given" || type === "debt_payment") {
    return "qarz";
  }

  const normalizedExplicit = normalizeCategory(explicitCategory);
  if (normalizedExplicit !== "boshqa" || cleanText(explicitCategory)) {
    return normalizedExplicit;
  }

  return inferCategory(text || "");
};

const resolvePaymentMeta = (type, amount, paymentStatus, paidAmount, remainingAmount) => {
  if (type === "expense" || type === "income") {
    return {
      payment_status: "paid",
      paid_amount: typeof amount === "number" ? amount : 0,
      remaining_amount: 0
    };
  }

  if (type === "debt_payment") {
    return {
      payment_status: "paid",
      paid_amount: typeof amount === "number" ? amount : 0,
      remaining_amount: 0
    };
  }

  const normalizedPaymentStatus = String(paymentStatus || "").trim().toLowerCase();
  if (normalizedPaymentStatus === "paid") {
    return {
      payment_status: "paid",
      paid_amount: typeof amount === "number" ? amount : 0,
      remaining_amount: 0
    };
  }

  const normalizedPaidAmount = toOptionalMoneyNumber(paidAmount) ?? 0;
  const normalizedRemainingAmount = toOptionalMoneyNumber(remainingAmount);

  if (normalizedPaymentStatus === "partial" || normalizedPaidAmount > 0) {
    return {
      payment_status: "partial",
      paid_amount: normalizedPaidAmount,
      remaining_amount:
        normalizedRemainingAmount != null
          ? normalizedRemainingAmount
          : Math.max((typeof amount === "number" ? amount : 0) - normalizedPaidAmount, 0)
    };
  }

  return {
    payment_status: "unpaid",
    paid_amount: 0,
    remaining_amount: typeof amount === "number" ? amount : 0
  };
};

const normalizeOptionalPositiveNumber = (value) => {
  if (value === "" || value == null) {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.round(numeric);
};

const toOptionalMoneyNumber = (value) => {
  if (value === "" || value == null) {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  return Math.round(numeric);
};

const normalizeDateString = (value, fallback) => {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
};

const normalizeTimeString = (value, fallback) => {
  const text = String(value || "").trim();
  return /^\d{2}:\d{2}$/.test(text) ? text : fallback;
};

const normalizeIsoString = (value, fallback) => {
  const text = String(value || "").trim();
  return text && !Number.isNaN(new Date(text).getTime()) ? new Date(text).toISOString() : fallback;
};

const cleanText = (value) => String(value || "").trim();

const cleanNullableText = (value) => {
  const text = cleanText(value);
  return text ? text : null;
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime = (date) => {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
};

const normalizeLooseWord = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\u2019\u2018`\u02BB\u02BC]/g, "'")
    .replace(/(?:ning|dan|tan|ga|ka|qa|ni|da|lik)$/i, "");

const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
