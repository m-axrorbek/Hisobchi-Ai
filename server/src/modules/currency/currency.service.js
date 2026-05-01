const CBU_RATES_URL = "https://cbu.uz/en/arkhiv-kursov-valyut/json/";
const SUPPORTED_CURRENCIES = new Set(["USD", "EUR", "RUB", "GBP", "JPY", "CHF", "CNY"]);
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let cachedPayload = null;
let cachedAt = 0;
let pendingRequest = null;

export const currencyService = {
  async getRates() {
    const now = Date.now();
    if (cachedPayload && now - cachedAt < CACHE_TTL_MS) {
      return cachedPayload;
    }

    if (!pendingRequest) {
      pendingRequest = fetch(CBU_RATES_URL)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("CBU_RATES_REQUEST_FAILED");
          }

          const payload = await response.json();
          const normalized = normalizeRatesPayload(payload);
          if (!Object.keys(normalized.rates).length) {
            throw new Error("CBU_RATES_EMPTY");
          }

          cachedPayload = normalized;
          cachedAt = Date.now();
          return cachedPayload;
        })
        .finally(() => {
          pendingRequest = null;
        });
    }

    return pendingRequest;
  }
};

const normalizeRatesPayload = (payload) => {
  const entries = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  const bestByCurrency = new Map();

  entries.forEach((entry) => {
    const code = String(entry?.Ccy || entry?.ccy || entry?.code || "").toUpperCase().trim();
    if (!SUPPORTED_CURRENCIES.has(code)) {
      return;
    }

    const rate = parseRate(entry?.Rate ?? entry?.rate ?? entry?.value);
    if (!rate) {
      return;
    }

    const currentDate = parseDateValue(entry?.Date ?? entry?.date ?? entry?.updated_at);
    const existing = bestByCurrency.get(code);

    if (!existing || currentDate >= existing.dateValue) {
      bestByCurrency.set(code, {
        rate,
        dateValue: currentDate,
        dateText: entry?.Date ?? entry?.date ?? ""
      });
    }
  });

  const rates = {};
  let updatedAt = "";

  bestByCurrency.forEach((value, code) => {
    rates[code] = value.rate;
    if (!updatedAt || value.dateValue > parseDateValue(updatedAt)) {
      updatedAt = value.dateText || updatedAt;
    }
  });

  return {
    base: "UZS",
    updated_at: updatedAt,
    rates
  };
};

const parseRate = (value) => {
  const numeric = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
};

const parseDateValue = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return 0;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return Date.parse(`${text}T00:00:00Z`) || 0;
  }

  const dotMatch = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    return Date.parse(`${year}-${month}-${day}T00:00:00Z`) || 0;
  }

  return Date.parse(text) || 0;
};
