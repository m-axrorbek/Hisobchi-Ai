import { currencyApi } from "../api.js";

const FALLBACK_RATES = Object.freeze({
  USD: 12190.43,
  EUR: 14362.76,
  RUB: 162.09,
  GBP: 16526.57,
  JPY: 76.72,
  CHF: 15594.77,
  CNY: 1787.06
});

const CURRENCY_PATTERNS = [
  { code: "USD", marker: "$", words: ["usd", "dollar", "dollor", "dolar", "baks"] },
  { code: "EUR", marker: "eur", words: ["eur", "euro", "yevro", "evro"] },
  { code: "RUB", marker: "rub", words: ["rub", "rubl", "ruble"] },
  { code: "GBP", marker: "gbp", words: ["gbp", "funt", "pound"] },
  { code: "JPY", marker: "jpy", words: ["jpy", "yen"] },
  { code: "CHF", marker: "chf", words: ["chf", "frank"] },
  { code: "CNY", marker: "cny", words: ["cny", "yuan"] }
];

const UZS_WORDS = ["uzs", "sum", "som", "so'm"];
const CURRENCY_SUFFIX_PATTERN = "(?:ga|ka|qa|dan|tan|ni|da|ning|lik)?";
const RATES_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let cachedRates = FALLBACK_RATES;
let cachedAt = 0;
let pendingRatesPromise = null;

export const normalizeMoneyDraftCurrency = async (draft, sourceText = "") => {
  if (!draft || draft.intent === "clarify" || draft.intent === "off_topic" || draft.amount === "full" || draft.original_currency) {
    return draft;
  }

  const detectedCurrency = detectCurrencyCode(sourceText || draft.note || "");
  if (detectedCurrency === "UZS") {
    return {
      ...draft,
      currency: "UZS"
    };
  }

  const amount = Number(draft.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ...draft,
      currency: "UZS"
    };
  }

  const rates = await getCurrencyRates();
  const rate = Number(rates[detectedCurrency] || 0);
  if (!Number.isFinite(rate) || rate <= 0) {
    return {
      ...draft,
      currency: "UZS"
    };
  }

  const convertedAmount = convertMoneyValue(amount, rate);
  const quantity = Math.max(Number(draft.quantity || 1) || 1, 1);
  const convertedUnitPrice =
    Number(draft.unit_price || 0) > 0 ? convertMoneyValue(draft.unit_price, rate) : Math.round(convertedAmount / quantity);

  return {
    ...draft,
    amount: convertedAmount,
    unit_price: convertedUnitPrice,
    line_items: convertLineItems(draft.line_items, rate),
    paid_amount: convertMoneyValue(draft.paid_amount, rate),
    remaining_amount: convertMoneyValue(draft.remaining_amount, rate),
    currency: "UZS",
    original_currency: detectedCurrency,
    original_amount: amount,
    exchange_rate: rate
  };
};

const detectCurrencyCode = (text) => {
  const normalized = normalizeCurrencyText(text);
  if (!normalized) {
    return "UZS";
  }

  if (UZS_WORDS.some((word) => hasCurrencyWord(normalized, word))) {
    return "UZS";
  }

  const matched = CURRENCY_PATTERNS.find(({ marker, words }) => {
    if (marker.length === 1 && normalized.includes(marker)) {
      return true;
    }

    return words.some((word) => hasCurrencyWord(normalized, word));
  });

  return matched?.code || "UZS";
};

const getCurrencyRates = async () => {
  const now = Date.now();
  if (cachedAt && now - cachedAt < RATES_CACHE_TTL_MS) {
    return cachedRates;
  }

  if (!pendingRatesPromise) {
    pendingRatesPromise = currencyApi
      .rates()
      .then((payload) => {
        const normalizedRates = normalizeRatesPayload(payload);
        cachedRates = {
          ...FALLBACK_RATES,
          ...normalizedRates
        };
        cachedAt = Date.now();
        return cachedRates;
      })
      .catch(() => {
        cachedAt = Date.now();
        return cachedRates;
      })
      .finally(() => {
        pendingRatesPromise = null;
      });
  }

  return pendingRatesPromise;
};

const normalizeRatesPayload = (payload) => {
  if (!payload) {
    return {};
  }

  const source = payload.rates && typeof payload.rates === "object" ? payload.rates : payload;

  return Object.entries(source).reduce((accumulator, [code, value]) => {
    const normalizedCode = String(code || "").toUpperCase().trim();
    const rate = parseRate(value);
    if (!normalizedCode || !rate) {
      return accumulator;
    }

    accumulator[normalizedCode] = rate;
    return accumulator;
  }, {});
};

const convertMoneyValue = (value, rate) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return Math.max(Math.round(numeric * rate), 0);
};

const convertLineItems = (lineItems, rate) =>
  Array.isArray(lineItems)
    ? lineItems.map((lineItem) => ({
        ...lineItem,
        amount: lineItem?.amount == null ? null : convertMoneyValue(lineItem.amount, rate),
        unit_price: lineItem?.unit_price == null ? null : convertMoneyValue(lineItem.unit_price, rate)
      }))
    : [];

const parseRate = (value) => {
  const numeric = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeCurrencyText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[\u2019\u2018`\u02BB\u02BC]/g, "'");

const hasCurrencyWord = (text, word) =>
  new RegExp(`\\b${escapeForRegex(word)}${CURRENCY_SUFFIX_PATTERN}\\b`, "i").test(text);

const escapeForRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
