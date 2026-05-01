import { cleanAssistantInput } from "./clean.js";
import { extractDateTimeParts } from "./datetime.js";
import { inferCategory, normalizeCategory } from "../money/categories.js";

const DEBT_GIVEN_HINTS = ["qarz berdim", "qarzga berdim", "qarz beraman", "berdim", "beraman", "uzatdim"];
const DEBT_TAKEN_HINTS = ["qarzga", "nasiya", "qarz oldim", "qarz olaman", "oldim", "olaman"];
const PAYMENT_HINTS = ["to'ladim", "toladim", "yopdim", "qaytardim", "qaytardi", "yopib berdim"];
const OUTGOING_PAYMENT_HINTS = ["qarzimni", "qarzni", "to'ladim", "toladim", "yopdim"];
const INCOMING_PAYMENT_HINTS = ["qaytardi", "qaytarib berdi", "berib yubordi"];
const INCOME_HINTS = ["daromad", "ishlab topdim", "maosh oldim"];
const INCOME_MONEY_HINTS = ["pul", "daromad", "maosh", "tushum"];
const SHARED_ACTIVITY_HINTS = [
  "kirdik",
  "kirdim",
  "bordik",
  "bordim",
  "chipta",
  "kino",
  "teatr",
  "park",
  "muzey",
  "zoo",
  "zarga",
  "sirk",
  "konsert"
];
const ITEM_KEYWORDS = [
  "ovqat",
  "silyos",
  "kartoshka",
  "qatiq",
  "benzin",
  "taksi",
  "non",
  "sut",
  "dori",
  "kiyim",
  "poyabzal",
  "kino",
  "teatr",
  "park",
  "muzey",
  "zoo",
  "zarga",
  "chipta",
  "kirish"
];
const DATE_TIME_WORDS = [
  "bugun",
  "kecha",
  "erta",
  "ertaga",
  "indin",
  "indinga",
  "ertalab",
  "tong",
  "tushda",
  "peshin",
  "tushdan keyin",
  "kunduz",
  "kunduzi",
  "kechqurun",
  "kechasi",
  "yarim tun",
  "soat"
];
const COMPANION_IGNORE_WORDS = new Set(["men", "biz", "bugun", "kecha", "ertaga", "bilan"]);
const MONEY_DOMAIN_HINTS = [
  "pul",
  "sum",
  "som",
  "so'm",
  "usd",
  "dollar",
  "dollor",
  "dolar",
  "qarz",
  "nasiya",
  "daromad",
  "maosh",
  "xarajat",
  "harajat",
  "oldim",
  "sotib",
  "berdim",
  "to'ladim",
  "toladim",
  "to'lab",
  "tolab",
  "yopdim",
  "qaytardi",
  "qaytardim",
  "kirdi",
  "kirdik",
  "kirdim",
  "bordik",
  "bordim",
  "ketdi",
  "tushdi",
  "chiqdi",
  "ovqat",
  "kartoshka",
  "qatiq",
  "benzin",
  "taksi",
  "non",
  "sut",
  "dori",
  "kiyim",
  "poyabzal",
  ...DATE_TIME_WORDS
];
const QUESTION_WORDS = ["nima", "nega", "qanday", "qachon", "kim", "qayer", "qayerda", "qayerdan", "necha", "qancha"];
const OFF_TOPIC_CONVERSATION_HINTS = [
  "salom",
  "assalomu alaykum",
  "yaxshimisan",
  "qalesan",
  "qalaysan",
  "ahvoling",
  "isming",
  "kimsan",
  "kimsan",
  "necha yosh",
  "qayerdansan",
  "shaxsiy",
  "telefon raqaming"
];
const OFF_TOPIC_REQUEST_HINTS = [
  "hazil",
  "hikoya",
  "ertak",
  "she'r",
  "qoshiq",
  "qo'shiq",
  "tarjima",
  "kod yoz",
  "rasm chiz",
  "ob havo",
  "yangilik",
  "futbol",
  "kino",
  "musiqa"
];
const OFF_TOPIC_WARNING =
  "Mavzudan chetlashmang. Bu yerda faqat xarajat, qarz, qarz to'lovi va daromad yozuvlari qabul qilinadi. Shaxsiy savollarga javob berilmaydi.";

const PERSON_TITLES = ["aka", "opa", "ota", "dada", "ona", "amaki", "tog'a", "xola", "usta"];
const MEASURE_UNITS = ["ta", "dona", "kg", "l", "litr", "quti", "pachka"];
const LINE_ITEM_SKIP_WORDS = new Set([
  "va",
  "yana",
  "bilan",
  "ham",
  "yoniga",
  "qoshib",
  "qo'shib",
  "olib",
  "oldim",
  "oldik",
  "olganman",
  "oldik",
  "uchun",
  "to'lab",
  "tolab",
  "ketdi",
  "ketadi",
  "qildim",
  "qildik"
]);
const LINE_ITEM_STOP_WORDS = new Set([
  "qo'shib",
  "qoshib",
  "oldim",
  "oldik",
  "olib",
  "ketdi",
  "ketadi",
  "berdim",
  "to'ladim",
  "toladim",
  "uchun"
]);
const TIME_TOKEN_PATTERN = /\b(?:soat\s*)?\d{1,2}\s*:\s*\d{2}(?:da|dan|gacha)?\b/gi;
const MONEY_WORDS = [
  "sum",
  "som",
  "uzs",
  "usd",
  "dollar",
  "dollor",
  "dolar",
  "eur",
  "euro",
  "yevro",
  "evro",
  "rub",
  "rubl",
  "gbp",
  "funt",
  "pound",
  "jpy",
  "yen",
  "cny",
  "yuan",
  "chf",
  "frank",
  "milliard",
  "million",
  "milyon",
  "mlrd",
  "mln",
  "ming"
];

const STOP_WORDS = new Set([
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
  "soat",
  "qarz",
  "qarzga",
  "oldim",
  "bilan",
  "berdim",
  "ketdi",
  "to'ladim",
  "toladim",
  "to'lab",
  "tolab",
  "yopdim",
  "qaytardi",
  "qaytardim",
  "kirdim",
  "kirdik",
  "bordim",
  "bordik",
  "meni",
  "menga",
  "undan",
  "unga",
  "akadan",
  "akaga",
  "opadan",
  "opaga",
  "dan",
  "ga",
  "uchun",
  ...MONEY_WORDS
]);

export const analyzeAssistantInput = (rawText) => {
  const original = String(rawText || "").trim();
  const cleaned = cleanAssistantInput(original);

  if (!cleaned) {
    return null;
  }

  if (isOffTopicInput(original, cleaned)) {
    return buildOffTopic();
  }

  const type = detectRecordType(cleaned);
  const dateTime = extractDateTimeParts(cleaned, { defaultToCurrentTime: true });
  const person = extractPerson(original, cleaned, type);
  const store = person ? "" : extractStore(original, cleaned);
  const lineItems = extractLineItems(cleaned, { type, store });
  const amount = resolveDraftAmount(cleaned, lineItems);

  if (type === "debt_payment") {
    if (!person) {
      return buildClarify("Qaysi qarzni yopamiz?");
    }

    const amountValue = extractPaymentAmount(cleaned);
    if (amountValue == null) {
      return buildClarify("Qancha pul to'langanini yozing.");
    }

    return {
      intent: "debt_payment",
      type,
      person,
      amount: amountValue,
      payment_direction: detectPaymentDirection(cleaned),
      date: dateTime.date,
      time: dateTime.time,
      note: cleaned
    };
  }

  if (!amount) {
    return buildClarify("Qancha pul ketganini aniqlashtirib yuboring.");
  }

  if ((type === "debt_taken" || type === "debt_given") && !person) {
    return buildClarify("36 ming kimga tegishli?");
  }

  if (cleaned.includes("qarz") && type === "expense") {
    return buildClarify("Qarz oldingizmi yoki berdingizmi?");
  }

  const quantity = extractQuantity(cleaned, amount, { type, lineItems });
  const item = lineItems.length ? summarizeLineItems(lineItems) : extractItem(cleaned, { type, person, store, quantity, amount });
  const category = resolveCategory(cleaned, lineItems.length ? lineItems.map((entry) => entry.item).join(" ") : item, type);
  const paymentStatus = resolvePaymentStatus(type);
  const paidAmount = paymentStatus === "paid" ? amount : 0;
  const remainingAmount = paymentStatus === "paid" ? 0 : amount;

  return {
    intent: type === "income" ? "income" : type.includes("debt") ? "debt" : "expense",
    type,
    item,
    quantity,
    unit_price: quantity > 0 ? Math.round(amount / quantity) : amount,
    amount,
    line_items: lineItems,
    category,
    person,
    store,
    payment_status: paymentStatus,
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    date: dateTime.date,
    time: dateTime.time,
    note: cleaned
  };
};

export const splitAssistantSegments = (text) =>
  String(text || "")
    .split(/,|;|\byana\b/gi)
    .map((segment) => segment.trim())
    .filter(Boolean);

const detectRecordType = (text) => {
  if (hasAnyPhrase(text, PAYMENT_HINTS) && hasStandaloneWord(text, "qarz")) {
    return "debt_payment";
  }

  if (hasAnyPhrase(text, DEBT_GIVEN_HINTS) && hasStandaloneWord(text, "qarz")) {
    return "debt_given";
  }

  if (hasAnyPhrase(text, DEBT_TAKEN_HINTS) && hasStandaloneWord(text, "qarz")) {
    return "debt_taken";
  }

  if (hasIncomeIntent(text) && !hasStandaloneWord(text, "qarz")) {
    return "income";
  }

  return "expense";
};

const extractAmount = (text) => {
  const values = extractNumericValues(stripTimeTokens(text));

  if (!values.length) {
    return 0;
  }

  const explicitMoney = values.filter((value) => value >= 1000);
  if (explicitMoney.length) {
    return explicitMoney[explicitMoney.length - 1];
  }

  return values[values.length - 1];
};

const resolveDraftAmount = (text, lineItems) => {
  const explicitLineItemTotal = sumLineItemAmounts(lineItems);
  if (explicitLineItemTotal > 0) {
    return explicitLineItemTotal;
  }

  return extractAmount(text);
};

const extractPaymentAmount = (text) => {
  if (/to'liq|toliq/.test(text)) {
    return "full";
  }

  const amount = extractAmount(text);
  return amount || null;
};

const extractQuantity = (text, amount, context = {}) => {
  if (Array.isArray(context.lineItems) && context.lineItems.length > 1) {
    return context.lineItems.length;
  }

  const quantityText = stripTimeTokens(text);
  const measured = quantityText.match(new RegExp(`\\b(\\d{1,3})\\s*(?:${MEASURE_UNITS.join("|")})\\b`, "i"));
  if (measured) {
    return Math.max(Number.parseInt(measured[1], 10) || 1, 1);
  }

  const values = extractNumericValues(quantityText).filter((value) => value !== amount);

  const quantity = values.find((value) => value > 0 && value < 1000);
  if (quantity) {
    return quantity;
  }

  const companionQuantity = inferCompanionQuantity(text, context.type);
  return companionQuantity || 1;
};

const extractItem = (text, { type, person, store, amount }) => {
  if (type === "debt_given") {
    return "qarz berdim";
  }
  if (type === "debt_taken" && !text.includes("oldim")) {
    return "qarz oldim";
  }
  if (type === "income") {
    return "daromad";
  }

  const keywordItem = ITEM_KEYWORDS.find((keyword) => text.includes(keyword)) || "";

  if (keywordItem) {
    return keywordItem;
  }

  const cleaned = text
    .replace(person ? new RegExp(`\\b${escapeForRegex(person)}\\b`, "gi") : /$^/, " ")
    .replace(store ? new RegExp(`\\b${escapeForRegex(store)}\\b`, "gi") : /$^/, " ")
    .replace(new RegExp(`\\b${amount}\\b`, "g"), " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\b\d{1,2}:\d{2}\b/g, " ")
    .replace(new RegExp(`\\b(?:${MEASURE_UNITS.join("|")})\\b`, "gi"), " ")
    .replace(new RegExp(`\\b(?:${MONEY_WORDS.join("|")})\\b`, "gi"), " ")
    .replace(/\bto['`]?lab\b/gi, " ")
    .replace(/\btolab\b/gi, " ")
    .replace(/\b(?:bugun|kecha|ertaga|qarzga|qarz|to'ladim|toladim|berdim|oldim|ketdi|qaytardi|yopdim|dan|ga|da)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !STOP_WORDS.has(word))
    .filter((word) => !person?.toLowerCase().split(/\s+/).includes(word))
    .filter((word) => !store?.toLowerCase().split(/\s+/).includes(word))
    .slice(0, 2);

  if (!words.length) {
    return type === "expense" ? "xarajat" : type === "debt_taken" ? "qarz oldim" : "qarz berdim";
  }

  return words.join(" ");
};

const extractLineItems = (text, context = {}) => {
  if (context.type !== "expense") {
    return [];
  }

  const prepared = prepareLineItemSource(text, context);
  const tokens = prepared.match(/\d+|[\p{L}'`-]+/gu) || [];
  const entries = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!/^\d+$/.test(token)) {
      continue;
    }

    const numeric = Number.parseInt(token, 10);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      continue;
    }

    let cursor = index + 1;
    if (isMeasureUnitToken(tokens[cursor])) {
      cursor += 1;
    }

    const words = [];
    while (cursor < tokens.length) {
      const candidate = tokens[cursor];
      const normalizedCandidate = normalizeWord(candidate);

      if (/^\d+$/.test(candidate)) {
        break;
      }

      if (LINE_ITEM_STOP_WORDS.has(normalizedCandidate)) {
        if (words.length) {
          break;
        }

        cursor += 1;
        continue;
      }

      if (LINE_ITEM_SKIP_WORDS.has(normalizedCandidate)) {
        if (words.length) {
          break;
        }

        cursor += 1;
        continue;
      }

      if (STOP_WORDS.has(normalizedCandidate)) {
        cursor += 1;
        continue;
      }

      words.push(candidate);
      cursor += 1;
    }

    const item = sanitizeLineItemWords(words);
    if (!item) {
      index = Math.max(cursor - 1, index);
      continue;
    }

    const quantity = numeric >= 1000 ? 1 : numeric;
    const amount = numeric >= 1000 ? numeric : null;

    entries.push({
      item,
      quantity,
      amount,
      unit_price: amount != null && quantity > 0 ? Math.round(amount / quantity) : null
    });

    index = Math.max(cursor - 1, index);
  }

  return mergeLineItems(entries);
};

const resolveCategory = (text, item, type) => {
  if (type === "debt_given" || type === "debt_payment" || type === "debt_taken") {
    return "qarz";
  }

  const explicit = text.match(/\b(oziq-ovqat|transport|kiyim|sog'liq|qarz|boshqa)\b/i)?.[0];
  if (explicit) {
    return normalizeCategory(explicit);
  }

  return inferCategory(`${text} ${item}`);
};

const resolvePaymentStatus = (type) => {
  if (type === "expense" || type === "income") {
    return "paid";
  }
  return "unpaid";
};

const extractPerson = (original, cleaned, type) => {
  const titledPattern = new RegExp(`\\b([\\p{L}'\`-]+)\\s+(${PERSON_TITLES.join("|")})(?:dan|ga|ni|ning|bilan)?\\b`, "iu");
  const titledMatch = original.match(titledPattern) || cleaned.match(titledPattern);
  if (titledMatch) {
    return `${capitalize(titledMatch[1])} ${titledMatch[2].toLowerCase()}`;
  }

  const companionPerson = extractCompanionPerson(original) || extractCompanionPerson(cleaned);
  if (companionPerson) {
    return companionPerson;
  }

  if (!["debt_taken", "debt_given", "debt_payment"].includes(type)) {
    return "";
  }

  const plainMatch =
    original.match(/\b([\p{L}'`-]{2,})\s*(?:dan|ga)\b/u) ||
    cleaned.match(/\b([\p{L}'`-]{2,})\s*(?:dan|ga)\b/u);

  if (
    plainMatch &&
    !["korzinka", "havas", "market", "magazin"].includes(plainMatch[1].toLowerCase()) &&
    !isDateTimeLikeWord(plainMatch[1])
  ) {
    return capitalize(plainMatch[1]);
  }

  return "";
};

const extractStore = (original, cleaned) => {
  const storeMatch =
    original.match(/\b([\p{L}'`-]{2,}(?:\s+[\p{L}'`-]{2,}){0,2})dan\b/u) ||
    cleaned.match(/\b([\p{L}'`-]{2,}(?:\s+[\p{L}'`-]{2,}){0,2})dan\b/u);

  if (!storeMatch) {
    return "";
  }

  const value = storeMatch[1].toLowerCase();
  if (PERSON_TITLES.includes(value) || ["aka", "opa"].includes(value) || isDateTimeLikeWord(value)) {
    return "";
  }

  return capitalize(storeMatch[1]);
};

const detectPaymentDirection = (text) => {
  if (hasAnyPhrase(text, INCOMING_PAYMENT_HINTS)) {
    return "incoming";
  }
  if (hasAnyPhrase(text, OUTGOING_PAYMENT_HINTS)) {
    return "outgoing";
  }
  return "outgoing";
};

const inferCompanionQuantity = (text, type) => {
  if (type !== "expense" || !looksLikeSharedActivity(text)) {
    return 0;
  }

  const companionCount = extractCompanionCount(text);
  return companionCount > 0 ? companionCount + 1 : 0;
};

const looksLikeSharedActivity = (text) => hasAnyPhrase(text, SHARED_ACTIVITY_HINTS);

const extractCompanionCount = (text) => {
  const companions = extractCompanionPeople(text);
  return companions.length;
};

const extractCompanionPerson = (text) => extractCompanionPeople(text)[0] || "";

const extractCompanionPeople = (text) => {
  if (!/\bbilan\b/i.test(String(text || ""))) {
    return [];
  }

  const beforeBilan = String(text || "").split(/\bbilan\b/i)[0]?.trim() || "";
  if (!beforeBilan) {
    return [];
  }

  return beforeBilan
    .replace(/\s*,\s*/g, " va ")
    .split(/\s+va\s+/i)
    .map((segment) => normalizeCompanionSegment(segment))
    .filter(Boolean);
};

const normalizeCompanionSegment = (segment) => {
  const words = String(segment || "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !COMPANION_IGNORE_WORDS.has(word.toLowerCase()));

  if (!words.length) {
    return "";
  }

  const lastWord = words[words.length - 1];
  const previousWord = words[words.length - 2];

  if (PERSON_TITLES.includes(String(lastWord || "").toLowerCase()) && previousWord) {
    return `${capitalize(previousWord)} ${String(lastWord).toLowerCase()}`;
  }

  return capitalize(lastWord);
};

const prepareLineItemSource = (text, context = {}) => {
  const storePattern = context.store
    ? new RegExp(`\\b${escapeForRegex(context.store)}(?:dan|ga|da|ning|ni)?\\b`, "gi")
    : null;

  const normalized = stripTimeTokens(text)
    .replace(/\b(?:bugun|kecha|ertaga|indin|indinga|ertalab|tong|tushda|peshin|tushdan|keyin|kunduz|kunduzi|kechqurun|kechasi|yarim|tun|soat)\b/gi, " ")
    .replace(/\b[\p{L}'`-]+(?:\s+[\p{L}'`-]+){0,2}\s+do['`]?konidan\b/giu, " ")
    .replace(/\b(?:dan|ga|da)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return storePattern ? normalized.replace(storePattern, " ").replace(/\s{2,}/g, " ").trim() : normalized;
};

const sanitizeLineItemWords = (words) => {
  const cleanedWords = words
    .map((word) => String(word || "").trim())
    .filter(Boolean)
    .filter((word) => !STOP_WORDS.has(normalizeWord(word)))
    .filter((word) => !LINE_ITEM_SKIP_WORDS.has(normalizeWord(word)))
    .slice(0, 4);

  if (!cleanedWords.length) {
    return "";
  }

  return cleanedWords.join(" ").toLowerCase();
};

const summarizeLineItems = (lineItems) => {
  if (!Array.isArray(lineItems) || !lineItems.length) {
    return "xarajat";
  }

  if (lineItems.length === 1) {
    return lineItems[0].item;
  }

  return `${lineItems.length} ta mahsulot`;
};

const mergeLineItems = (entries) =>
  entries.reduce((accumulator, entry) => {
    const item = cleanLineItemText(entry.item);
    if (!item) {
      return accumulator;
    }

    const existing = accumulator.find((current) => current.item === item);
    if (!existing) {
      accumulator.push({
        item,
        quantity: Math.max(Number(entry.quantity || 1) || 1, 1),
        amount: entry.amount == null ? null : Math.max(Number(entry.amount || 0) || 0, 0),
        unit_price: entry.unit_price == null ? null : Math.max(Number(entry.unit_price || 0) || 0, 0)
      });
      return accumulator;
    }

    existing.quantity += Math.max(Number(entry.quantity || 1) || 1, 1);
    if (entry.amount != null) {
      existing.amount = (existing.amount || 0) + Math.max(Number(entry.amount || 0) || 0, 0);
    }
    if (existing.amount && existing.quantity > 0) {
      existing.unit_price = Math.round(existing.amount / existing.quantity);
    }

    return accumulator;
  }, []);

const sumLineItemAmounts = (lineItems) =>
  Array.isArray(lineItems)
    ? lineItems.reduce((total, entry) => total + (Number.isFinite(Number(entry?.amount)) ? Number(entry.amount) : 0), 0)
    : 0;

const extractNumericValues = (text) =>
  Array.from(String(text || "").matchAll(/\b\d+\b/g))
    .map((match) => Number.parseInt(match[0], 10))
    .filter((value) => !Number.isNaN(value));

const stripTimeTokens = (value) => String(value || "").replace(TIME_TOKEN_PATTERN, " ");

const isMeasureUnitToken = (value) => MEASURE_UNITS.includes(normalizeWord(value));

const normalizeWord = (value) => String(value || "").toLowerCase().trim();

const cleanLineItemText = (value) => String(value || "").replace(/\s{2,}/g, " ").trim();

const buildClarify = (question) => ({
  intent: "clarify",
  question
});

const buildOffTopic = () => ({
  intent: "off_topic",
  message: OFF_TOPIC_WARNING
});

const isOffTopicInput = (original, cleaned) => {
  const normalized = `${original} ${cleaned}`.toLowerCase();
  if (!normalized.trim()) {
    return false;
  }

  if (hasMoneyDomainSignal(normalized)) {
    return false;
  }

  if (OFF_TOPIC_CONVERSATION_HINTS.some((hint) => normalized.includes(hint))) {
    return true;
  }

  if (OFF_TOPIC_REQUEST_HINTS.some((hint) => normalized.includes(hint))) {
    return true;
  }

  return looksLikeGeneralQuestion(original, cleaned);
};

const hasMoneyDomainSignal = (text) =>
  MONEY_DOMAIN_HINTS.some((hint) => text.includes(hint));

const looksLikeGeneralQuestion = (original, cleaned) =>
  original.includes("?") || QUESTION_WORDS.some((word) => new RegExp(`\\b${escapeForRegex(word)}\\b`, "i").test(cleaned));

const hasIncomeIntent = (text) => {
  if (hasAnyPhrase(text, INCOME_HINTS)) {
    return true;
  }

  return (
    INCOME_MONEY_HINTS.some((hint) => new RegExp(`\\b${escapeForRegex(hint)}\\b\\s+kirdi\\b`, "i").test(text)) ||
    INCOME_MONEY_HINTS.some((hint) => new RegExp(`\\bkirdi\\b\\s+${escapeForRegex(hint)}\\b`, "i").test(text))
  );
};

const hasAnyPhrase = (text, phrases) => phrases.some((phrase) => hasStandalonePhrase(text, phrase));

const hasStandaloneWord = (text, word) => new RegExp(`\\b${escapeForRegex(word)}\\b`, "i").test(text);

const hasStandalonePhrase = (text, phrase) =>
  new RegExp(`(^|\\s)${escapeForRegex(phrase)}(?=\\s|$)`, "i").test(String(text || ""));

const isDateTimeLikeWord = (value) =>
  DATE_TIME_WORDS.some((word) => word.replace(/\s+/g, "") === String(value || "").toLowerCase().replace(/\s+/g, ""));

const capitalize = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const escapeForRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
