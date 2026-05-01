import { cleanAssistantInput } from "./clean.js";
import { extractDateTimeParts } from "./datetime.js";
import {
  buildUnknownAssistantResult,
  normalizeAssistantIntent,
  normalizeAssistantPayload,
  normalizeAssistantRecord,
  normalizeAssistantUnit
} from "./schema.js";

const PERSON_TITLES = ["aka", "opa", "ota", "ona", "dada", "amaki", "tog'a", "xola", "usta"];
const STORE_TERMS = ["do'kon", "market", "magazin", "supermarket", "bozor", "apteka"];
const DATE_WORDS = [
  "bugun",
  "kecha",
  "ertaga",
  "indin",
  "indinga",
  "ertalab",
  "tong",
  "tushda",
  "peshin",
  "tushdan",
  "keyin",
  "kunduz",
  "kunduzi",
  "kechqurun",
  "kechasi",
  "yarim",
  "tun",
  "soat"
];
const EXPENSE_HINTS = ["oldim", "xarid qildim", "sotib oldim", "ketdi", "tolab oldim", "to'lab oldim"];
const INCOME_HINTS = ["pul tushdi", "pul keldi", "pul tushirdim", "daromad", "maosh oldim", "ishlab topdim"];
const DEBT_TAKEN_HINTS = ["qarz oldim", "nasiya oldim", "qarzga oldim", "qarzga"];
const DEBT_GIVEN_HINTS = ["qarz berdim"];
const DEBT_PAYMENT_HINTS = ["qarzimni to'ladim", "qarzni to'ladim", "qarzni yopdim", "qarzimni yopdim", "qaytardim", "qaytarib berdim"];
const MONEY_WORDS = new Set(["sum", "som", "so'm", "uzs", "pul"]);
const CONNECTOR_WORDS = new Set(["va", "bilan", "yana", "yoniga", "qo'shib", "qoshib", "uchun", "ham"]);
const TYPE_STOP_WORDS = new Set([
  "oldim",
  "xarid",
  "qildim",
  "sotib",
  "ketdi",
  "tolab",
  "to'lab",
  "pul",
  "tushdi",
  "keldi",
  "tushirdim",
  "daromad",
  "maosh",
  "ishlab",
  "topdim",
  "qarz",
  "qarzga",
  "nasiya",
  "berdim",
  "to'ladim",
  "yopdim",
  "qaytardim",
  "qaytarib",
  "berdi",
  "qildi"
]);
const ITEM_STOP_WORDS = new Set([...DATE_WORDS, ...TYPE_STOP_WORDS, ...CONNECTOR_WORDS, "dan", "ga", "da", "ni", "ning"]);
const MONTH_NAMES = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
const TIME_TOKEN_PATTERN = /\b(?:soat\s*)?\d{1,2}:\d{2}(?:da|ga|dan)?\b/gi;
const EXPLICIT_DATE_PATTERN = new RegExp(`\\b\\d{1,2}\\s+(?:${MONTH_NAMES.join("|")})\\b`, "gi");

export const analyzeAssistantInput = (rawText, options = {}) => {
  const original = String(rawText || "").trim();
  const cleaned = cleanAssistantInput(original);
  const now = options.now instanceof Date ? new Date(options.now) : new Date();

  if (!cleaned) {
    return buildUnknownAssistantResult("Matnni qayta yozib yuboring.");
  }

  const segments = splitAssistantSegments(cleaned);
  const records = [];

  for (const segment of segments) {
    const parsedSegment = parseSegment(segment, now);
    if (parsedSegment.needs_confirmation) {
      return parsedSegment;
    }

    records.push(...parsedSegment.records);
  }

  return normalizeAssistantPayload(
    {
      intent: normalizeAssistantIntent("", records),
      needs_confirmation: false,
      question: null,
      records
    },
    { now }
  );
};

export const splitAssistantSegments = (text) =>
  String(text || "")
    .split(/\s*(?:,|;|\n|\bkeyin\b|\bso'ng\b|\bsong\b)\s*/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

export const assistantResultToLegacyDrafts = (result) => {
  if (!result) {
    return [];
  }

  if (result.needs_confirmation || result.intent === "unknown") {
    return [
      {
        intent: "clarify",
        question: String(result.question || "Matnni aniqroq yozib yuboring.").trim(),
        preserveSourceText: true
      }
    ];
  }

  return (Array.isArray(result.records) ? result.records : [])
    .map((record) => assistantRecordToLegacyDraft(record))
    .filter(Boolean);
};

const parseSegment = (segment, now) => {
  const type = detectRecordType(segment);
  if (!type) {
    return buildUnknownAssistantResult("Bu xarajatmi, daromadmi yoki qarzmi?");
  }

  const dateTime = extractDateTimeParts(segment, {
    now,
    defaultToCurrentTime: true
  });
  const context = {
    type,
    person: extractPerson(segment, type),
    store: extractStore(segment),
    date: dateTime.date,
    time: dateTime.time,
    now
  };

  if (type === "debt_payment") {
    return parseDebtPaymentSegment(segment, context);
  }

  if (type === "income") {
    return parseIncomeSegment(segment, context);
  }

  return parseExpenseLikeSegment(segment, context);
};

const parseDebtPaymentSegment = (segment, context) => {
  if (!context.person) {
    return buildUnknownAssistantResult("Kimga yoki kimdan qarz to'langanini yozing.");
  }

  const amount = extractDebtPaymentAmount(segment);
  if (amount == null) {
    return buildUnknownAssistantResult("Qancha qarz to'langanini yozing.");
  }

  const record = normalizeAssistantRecord(
    {
      type: "debt_payment",
      item: null,
      quantity: null,
      unit: null,
      unit_price: null,
      amount,
      category: "qarz",
      person: context.person,
      store: null,
      note: amount === "full" ? "full debt payment" : "partial debt payment",
      date: context.date,
      time: context.time
    },
    { now: context.now, fallbackDate: context.date, fallbackTime: context.time }
  );

  return record
    ? { intent: "debt_payment", needs_confirmation: false, question: null, records: [record] }
    : buildUnknownAssistantResult("Qarz to'lovi ma'lumotini qayta ayting.");
};

const parseIncomeSegment = (segment, context) => {
  const amount = extractPrimaryAmount(segment);
  if (!isPositiveNumber(amount)) {
    return buildUnknownAssistantResult("Daromad summasini yozing.");
  }

  const item = inferIncomeItem(segment);
  const record = normalizeAssistantRecord(
    {
      type: "income",
      item,
      quantity: null,
      unit: null,
      unit_price: null,
      amount,
      person: context.person,
      store: context.store,
      note: null,
      date: context.date,
      time: context.time
    },
    { now: context.now, fallbackDate: context.date, fallbackTime: context.time }
  );

  return record ? { intent: "income", needs_confirmation: false, question: null, records: [record] } : buildUnknownAssistantResult("Daromadni qayta ayting.");
};

const parseExpenseLikeSegment = (segment, context) => {
  const prepared = prepareSegmentForItems(segment, context);
  const extracted = extractStructuredEntries(prepared);

  if (extracted.hasUnpricedQuantityLikePattern) {
    return buildUnknownAssistantResult("Mahsulot narxini to'liq yozib yuboring.");
  }

  if (extracted.entries.length) {
    const records = extracted.entries
      .map((entry) =>
        normalizeAssistantRecord(
          {
            type: context.type,
            item: entry.item,
            quantity: entry.quantity,
            unit: entry.unit,
            unit_price: entry.unit_price,
            amount: entry.amount,
            person: context.person,
            store: context.store,
            note: null,
            date: context.date,
            time: context.time
          },
          { now: context.now, fallbackDate: context.date, fallbackTime: context.time }
        )
      )
      .filter(Boolean);

    if (!records.length) {
      return buildUnknownAssistantResult("Yozuvni aniqroq yozib yuboring.");
    }

    return {
      intent: records.length > 1 ? normalizeAssistantIntent(context.type, records) : context.type,
      needs_confirmation: false,
      question: null,
      records
    };
  }

  const amount = extractPrimaryAmount(segment);
  if (!isPositiveNumber(amount)) {
    return buildUnknownAssistantResult("Summani aniqroq yozib yuboring.");
  }

  const item = inferSingleItem(prepared, context.type);
  const quantity = extractStandaloneQuantity(prepared, amount);
  const unit = extractStandaloneUnit(prepared);
  const unitPrice = quantity ? Math.round(amount / quantity) : null;
  const record = normalizeAssistantRecord(
    {
      type: context.type,
      item,
      quantity,
      unit,
      unit_price: unitPrice,
      amount,
      person: context.person,
      store: context.store,
      note: null,
      date: context.date,
      time: context.time
    },
    { now: context.now, fallbackDate: context.date, fallbackTime: context.time }
  );

  return record
    ? { intent: context.type, needs_confirmation: false, question: null, records: [record] }
    : buildUnknownAssistantResult("Yozuvni qayta aniqroq ayting.");
};

const extractStructuredEntries = (text) => {
  const tokens = tokenizeForItems(text);
  const entries = [];
  let index = 0;
  let hasUnpricedQuantityLikePattern = false;

  while (index < tokens.length) {
    const token = tokens[index];
    if (!isNumericToken(token)) {
      index += 1;
      continue;
    }

    const numeric = Number.parseInt(token, 10);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      index += 1;
      continue;
    }

    if (numeric < 1000) {
      const quantityFirst = parseQuantityFirstEntry(tokens, index);
      if (quantityFirst) {
        entries.push(quantityFirst.entry);
        index = quantityFirst.nextIndex;
        continue;
      }

      hasUnpricedQuantityLikePattern = true;
      index += 1;
      continue;
    }

    const amountFirst = parseAmountFirstEntry(tokens, index);
    if (amountFirst) {
      entries.push(amountFirst.entry);
      index = amountFirst.nextIndex;
      continue;
    }

    index += 1;
  }

  return {
    entries,
    hasUnpricedQuantityLikePattern
  };
};

const parseQuantityFirstEntry = (tokens, startIndex) => {
  const quantity = Number.parseInt(tokens[startIndex], 10);
  let cursor = startIndex + 1;
  let unit = normalizeAssistantUnit(tokens[cursor]);

  if (unit) {
    cursor += 1;
  } else {
    unit = null;
  }

  const itemWords = [];
  while (cursor < tokens.length) {
    const token = tokens[cursor];
    if (isNumericToken(token)) {
      break;
    }

    if (shouldBreakItemCollection(token, itemWords.length > 0)) {
      if (itemWords.length) {
        break;
      }

      cursor += 1;
      continue;
    }

    const normalizedWord = normalizeItemWord(token);
    if (!normalizedWord) {
      cursor += 1;
      continue;
    }

    itemWords.push(normalizedWord);
    cursor += 1;
  }

  if (!itemWords.length || !isNumericToken(tokens[cursor])) {
    return null;
  }

  const amount = Number.parseInt(tokens[cursor], 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    entry: {
      item: joinItemWords(itemWords),
      quantity,
      unit,
      amount,
      unit_price: Math.round(amount / quantity)
    },
    nextIndex: cursor + 1
  };
};

const parseAmountFirstEntry = (tokens, startIndex) => {
  const amount = Number.parseInt(tokens[startIndex], 10);
  let cursor = startIndex + 1;
  const itemWords = [];

  while (cursor < tokens.length) {
    const token = tokens[cursor];
    if (isNumericToken(token)) {
      break;
    }

    if (shouldBreakItemCollection(token, itemWords.length > 0)) {
      if (itemWords.length) {
        break;
      }

      cursor += 1;
      continue;
    }

    const normalizedWord = normalizeItemWord(token);
    if (!normalizedWord) {
      cursor += 1;
      continue;
    }

    itemWords.push(normalizedWord);
    cursor += 1;
  }

  if (!itemWords.length) {
    return null;
  }

  return {
    entry: {
      item: joinItemWords(itemWords),
      quantity: null,
      unit: null,
      amount,
      unit_price: null
    },
    nextIndex: cursor
  };
};

const prepareSegmentForItems = (segment, context) => {
  let prepared = stripDateAndTimeTokens(segment);

  if (context.person) {
    prepared = prepared.replace(new RegExp(`\\b${escapeForRegex(context.person.toLowerCase())}\\b`, "g"), " ");
  }

  if (context.store) {
    prepared = prepared.replace(new RegExp(`\\b${escapeForRegex(context.store.toLowerCase())}\\b`, "g"), " ");
    prepared = prepared.replace(/\bdo['`]?koni\b/g, " ");
  }

  return prepared
    .replace(/\b(?:oldim|xarid|qildim|sotib|ketdi|tolab|to'lab|pul|tushdi|keldi|tushirdim|qarzga|qarz|nasiya|berdim|to'ladim|yopdim|qaytardim|qaytarib|berdi|maosh|daromad|ishlab|topdim)\b/g, " ")
    .replace(/\b(?:sum|som|so'm|uzs)\b/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const inferSingleItem = (prepared, type) => {
  if (type === "debt_given") {
    return null;
  }

  if (type === "income") {
    return inferIncomeItem(prepared);
  }

  const words = tokenizeForItems(prepared)
    .filter((token) => !isNumericToken(token))
    .map((token) => normalizeItemWord(token))
    .filter(Boolean)
    .slice(0, 3);

  return words.length ? joinItemWords(words) : null;
};

const inferIncomeItem = (text) => {
  if (/\bmaosh\b/i.test(text)) {
    return "maosh";
  }
  if (/\bdaromad\b/i.test(text)) {
    return "daromad";
  }
  if (/\bpul\b/i.test(text)) {
    return "pul";
  }

  return null;
};

const extractStandaloneQuantity = (prepared, amount) => {
  const tokens = tokenizeForItems(prepared);
  for (let index = 0; index < tokens.length; index += 1) {
    if (!isNumericToken(tokens[index])) {
      continue;
    }

    const numeric = Number.parseInt(tokens[index], 10);
    if (!Number.isFinite(numeric) || numeric <= 0 || numeric === amount || numeric >= 1000) {
      continue;
    }

    return numeric;
  }

  return null;
};

const extractStandaloneUnit = (prepared) => {
  const tokens = tokenizeForItems(prepared);
  const matched = tokens.find((token) => normalizeAssistantUnit(token));
  return matched ? normalizeAssistantUnit(matched) : null;
};

const detectRecordType = (text) => {
  if (containsAnyPhrase(text, DEBT_PAYMENT_HINTS) || (/qarz/i.test(text) && hasAnyWord(text, ["to'ladim", "yopdim", "qaytardim"]))) {
    return "debt_payment";
  }

  if (containsAnyPhrase(text, DEBT_GIVEN_HINTS)) {
    return "debt_given";
  }

  if (containsAnyPhrase(text, DEBT_TAKEN_HINTS)) {
    return "debt_taken";
  }

  if (containsAnyPhrase(text, INCOME_HINTS)) {
    return "income";
  }

  if (containsAnyPhrase(text, EXPENSE_HINTS) || hasAnyWord(text, ["oldim", "ketdi"])) {
    return "expense";
  }

  if (extractPrimaryAmount(text) && !/qarz/i.test(text)) {
    return "expense";
  }

  return null;
};

const extractPrimaryAmount = (text) => {
  const values = extractNumericValues(stripDateAndTimeTokens(text));
  if (!values.length) {
    return null;
  }

  const explicitMoney = values.filter((value) => value >= 1000);
  return explicitMoney.length ? explicitMoney[explicitMoney.length - 1] : values[values.length - 1];
};

const extractDebtPaymentAmount = (text) => {
  if (/\bto'liq\b|\btoliq\b/i.test(text)) {
    return "full";
  }

  return extractPrimaryAmount(text);
};

const extractPerson = (text, type) => {
  const titledPattern = new RegExp(`\\b([\\p{L}'-]+)\\s+(${PERSON_TITLES.join("|")})(?:dan|ga|ni|ning)?\\b`, "iu");
  const titledMatch = text.match(titledPattern);
  if (titledMatch) {
    return `${capitalize(titledMatch[1])} ${titledMatch[2].toLowerCase()}`;
  }

  if (!["debt_taken", "debt_given", "debt_payment"].includes(type)) {
    return null;
  }

  const plainMatch = text.match(/\b([\p{L}'-]{2,})\s*(?:dan|ga)\b/u);
  if (!plainMatch) {
    return null;
  }

  const candidate = plainMatch[1].toLowerCase();
  if (STORE_TERMS.includes(candidate) || DATE_WORDS.includes(candidate) || MONEY_WORDS.has(candidate)) {
    return null;
  }

  return capitalize(candidate);
};

const extractStore = (text) => {
  const namedStore = text.match(/\b([\p{L}'-]{2,})\s+do['`]?konidan\b/u);
  if (namedStore) {
    return `${capitalize(namedStore[1])} do'koni`;
  }

  const storeWithTerm = text.match(/\b([\p{L}'-]{2,})\s+(market|magazin|supermarket|bozor|apteka)dan\b/u);
  if (storeWithTerm) {
    return `${capitalize(storeWithTerm[1])} ${storeWithTerm[2].toLowerCase()}`;
  }

  return null;
};

const stripDateAndTimeTokens = (text) =>
  String(text || "")
    .replace(TIME_TOKEN_PATTERN, " ")
    .replace(EXPLICIT_DATE_PATTERN, " ")
    .replace(new RegExp(`\\b(?:${DATE_WORDS.join("|")})\\b`, "g"), " ")
    .replace(/\s{2,}/g, " ")
    .trim();

const tokenizeForItems = (text) => String(text || "").match(/\d+|[\p{L}'-]+/gu) || [];

const normalizeItemWord = (value) => {
  const raw = String(value || "")
    .toLowerCase()
    .replace(/[\u2019\u2018`\u02BB\u02BC]/g, "'");
  const normalized = stripItemSuffix(raw).trim();

  if (!normalized || ITEM_STOP_WORDS.has(normalized) || MONEY_WORDS.has(normalized)) {
    return "";
  }

  if (normalizeAssistantUnit(normalized)) {
    return "";
  }

  return normalized;
};

const shouldBreakItemCollection = (token, hasItemWords) => {
  const normalized = String(token || "")
    .toLowerCase()
    .replace(/[\u2019\u2018`\u02BB\u02BC]/g, "'");

  if (ITEM_STOP_WORDS.has(normalized) || TYPE_STOP_WORDS.has(normalized)) {
    return hasItemWords;
  }

  return false;
};

const joinItemWords = (words) => words.join(" ").trim() || null;

const extractNumericValues = (text) =>
  Array.from(String(text || "").matchAll(/\b\d+\b/g))
    .map((match) => Number.parseInt(match[0], 10))
    .filter((value) => Number.isFinite(value) && value > 0);

const assistantRecordToLegacyDraft = (record) => {
  if (!record?.type) {
    return null;
  }

  return {
    intent: record.type,
    type: record.type,
    item: record.item || "",
    quantity: record.quantity ?? 1,
    unit: record.unit ?? null,
    unit_price: record.unit_price ?? 0,
    amount: record.amount,
    category: record.category || "",
    person: record.person || "",
    store: record.store || "",
    currency: record.currency || "UZS",
    payment_status: record.payment_status || "paid",
    paid_amount: Number(record.paid_amount || 0) || 0,
    remaining_amount: Number(record.remaining_amount || 0) || 0,
    date: record.date || "",
    time: record.time || "",
    note: record.note || "",
    archived: Boolean(record.archived),
    created_at: record.created_at || "",
    updated_at: record.updated_at || ""
  };
};

const containsAnyPhrase = (text, phrases) => phrases.some((phrase) => new RegExp(`(^|\\s)${escapeForRegex(phrase)}(?=\\s|$)`, "i").test(text));

const hasWord = (text, word) => new RegExp(`\\b${escapeForRegex(word)}\\b`, "i").test(text);

const hasAnyWord = (text, words) => words.some((word) => hasWord(text, word));

const isNumericToken = (value) => /^\d+$/.test(String(value || ""));

const capitalize = (value) => {
  const text = String(value || "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "";
};

const escapeForRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

const stripItemSuffix = (value) => {
  if (/(?:ning|dan|tan|ni)$/i.test(value)) {
    return value.replace(/(?:ning|dan|tan|ni)$/i, "");
  }

  if (value.length > 4 && /(?:ga|qa|da)$/i.test(value)) {
    return value.replace(/(?:ga|qa|da)$/i, "");
  }

  return value;
};
