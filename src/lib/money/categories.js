const CATEGORY_ALIASES = {
  "oziq-ovqat": "oziq-ovqat",
  oziqovqat: "oziq-ovqat",
  ovqat: "oziq-ovqat",
  non: "oziq-ovqat",
  sut: "oziq-ovqat",
  silyos: "oziq-ovqat",
  kartoshka: "oziq-ovqat",
  piyoz: "oziq-ovqat",
  tuxum: "oziq-ovqat",
  semichka: "oziq-ovqat",
  qatiq: "oziq-ovqat",
  market: "oziq-ovqat",
  ichimlik: "ichimlik",
  suv: "ichimlik",
  cola: "ichimlik",
  sharbat: "ichimlik",
  transport: "transport",
  benzin: "transport",
  taksi: "transport",
  kiyim: "kiyim",
  "oyoq kiyim": "kiyim",
  poyabzal: "kiyim",
  "sog'liq": "sog'liq",
  dori: "sog'liq",
  qarz: "qarz",
  boshqa: "boshqa"
};

const CATEGORY_KEYWORDS = [
  { category: "oziq-ovqat", keywords: ["ovqat", "non", "sut", "silyos", "kartoshka", "piyoz", "tuxum", "semichka", "qatiq", "go'sht", "gosht", "meva", "sabzavot"] },
  { category: "ichimlik", keywords: ["suv", "cola", "sharbat", "fanta", "pepsi", "ichimlik"] },
  { category: "transport", keywords: ["benzin", "taksi", "metro", "avtobus", "yol", "yo'l"] },
  { category: "kiyim", keywords: ["kiyim", "oyoq kiyim", "poyabzal", "etik", "ko'ylak", "kurtka"] },
  { category: "sog'liq", keywords: ["dori", "shifoxona", "tabletka", "analiz"] },
  { category: "qarz", keywords: ["qarz", "to'lov", "tolov"] }
];

export const CATEGORY_OPTIONS = [
  "oziq-ovqat",
  "ichimlik",
  "transport",
  "kiyim",
  "sog'liq",
  "qarz",
  "boshqa"
];

export const normalizeCategory = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "boshqa";
  }

  return CATEGORY_ALIASES[normalized] || normalized;
};

export const inferCategory = (text, fallback = "") => {
  const normalizedFallback = normalizeCategory(fallback);
  if (normalizedFallback !== "boshqa" || fallback) {
    return normalizedFallback;
  }

  const content = String(text || "").toLowerCase();
  const matched = CATEGORY_KEYWORDS.find(({ keywords }) => keywords.some((keyword) => content.includes(keyword)));

  return matched?.category || "boshqa";
};
