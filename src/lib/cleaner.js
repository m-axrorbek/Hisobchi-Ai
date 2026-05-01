const BASE_NUMBERS = {
  nol: 0,
  bir: 1,
  bitta: 1,
  ikki: 2,
  ikkita: 2,
  nikki: 2,
  uch: 3,
  uc: 3,
  uchta: 3,
  tort: 4,
  turt: 4,
  toyr: 4,
  besh: 5,
  olti: 6,
  yetti: 7,
  sakkiz: 8,
  sakiz: 8,
  toqqiz: 9,
  toqiz: 9,
  "o'n": 10,
  on: 10,
  un: 10,
  yigirma: 20,
  ygirma: 20,
  "o'ttiz": 30,
  ottiz: 30,
  qirq: 40,
  ellik: 50,
  oltmish: 60,
  yetmish: 70,
  sakson: 80,
  toqson: 90,
  "to'qson": 90
};

const MULTIPLIERS = {
  yuz: 100,
  ming: 1000,
  million: 1000000,
  millionlik: 1000000,
  milyon: 1000000,
  milyonlik: 1000000,
  mln: 1000000,
  milliard: 1000000000,
  milliardlik: 1000000000,
  billion: 1000000000,
  billionlik: 1000000000,
  mlrd: 1000000000
};

const FILLER_WORDS = new Set(["uka", "qara", "iltimos", "mayli", "xop", "xo'p", "yaxshi", "ana", "haligi"]);

const WORD_NORMALIZATIONS = [
  [/\bkorishnishni\b/g, "ko'rishni"],
  [/\bkorishni\b/g, "ko'rishni"],
  [/\bkorish\b/g, "ko'rish"],
  [/\bkoraman\b/g, "ko'raman"],
  [/\bqorish\b/g, "ko'rish"],
  [/\bqorishni\b/g, "ko'rishni"],
  [/\beslatib qoy\b/g, "eslat"],
  [/\beslatib qo'y\b/g, "eslat"],
  [/\bkino kor\b/g, "kino ko'r"],
  [/\bkino korish\b/g, "kino ko'rish"],
  [/\btoladim\b/g, "to'ladim"],
  [/\btoliq\b/g, "to'liq"],
  [/\bqarzga\b/g, "qarzga"],
  [/\bso'm\b/g, "sum"],
  [/\bsom\b/g, "sum"]
];

export const cleanUzbekInput = (input) => {
  if (!input) return "";

  let cleaned = input
    .toLowerCase()
    .replace(/[��`]/g, "'")
    .trim();

  for (const [pattern, replacement] of WORD_NORMALIZATIONS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Keep currency markers like "$" so later parsing can still detect foreign amounts.
  cleaned = cleaned.replace(/[.,\/#!%\^&\*;{}=_`~()]/g, " ");
  cleaned = normalizeSpacedThousands(cleaned);
  cleaned = normalizeAmountUnits(cleaned);

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const resultTokens = [];
  let currentSegment = 0;
  let totalNumber = 0;
  let hasNumber = false;

  const flushNumber = () => {
    if (!hasNumber) {
      return;
    }

    resultTokens.push(String(totalNumber + currentSegment));
    currentSegment = 0;
    totalNumber = 0;
    hasNumber = false;
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (FILLER_WORDS.has(token)) {
      continue;
    }

    const strippedToken = token.replace(/(inchi|nchi|ta|u|ga|ni|dan|da|lik)$/g, "");
    const nextToken = tokens[index + 1] || "";
    const nextStrippedToken = nextToken.replace(/(inchi|nchi|ta|u|ga|ni|dan|da|lik)$/g, "");

    if (/^\d+$/.test(token)) {
      if (Object.prototype.hasOwnProperty.call(MULTIPLIERS, nextToken) || Object.prototype.hasOwnProperty.call(MULTIPLIERS, nextStrippedToken)) {
        currentSegment += Number.parseInt(token, 10);
        hasNumber = true;
        continue;
      }

      flushNumber();
      resultTokens.push(token);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(BASE_NUMBERS, token) || Object.prototype.hasOwnProperty.call(BASE_NUMBERS, strippedToken)) {
      const value = BASE_NUMBERS[token] ?? BASE_NUMBERS[strippedToken];
      currentSegment += value;
      hasNumber = true;
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(MULTIPLIERS, token) || Object.prototype.hasOwnProperty.call(MULTIPLIERS, strippedToken)) {
      const multiplier = MULTIPLIERS[token] ?? MULTIPLIERS[strippedToken];
      hasNumber = true;

      if (multiplier === 100) {
        currentSegment = Math.max(currentSegment, 1) * multiplier;
      } else {
        totalNumber += Math.max(currentSegment, 1) * multiplier;
        currentSegment = 0;
      }
      continue;
    }

    flushNumber();
    resultTokens.push(token);
  }

  flushNumber();

  cleaned = resultTokens.join(" ");
  cleaned = cleaned.replace(/\bsoat\s+(\d{1,2})\s+(\d{2})\b/g, "soat $1:$2");
  cleaned = cleaned.replace(/\b(\d{1,2})\s+(\d{2})(?=\s*(?:da|ga)\b)/g, "$1:$2");
  cleaned = cleaned.replace(/\b(\d{1,2})(\d{2})(?=\s*(?:da|ga)\b)/g, (_, hour, minute) => {
    const h = Number.parseInt(hour, 10);
    const m = Number.parseInt(minute, 10);
    if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) {
      return `${hour}${minute}`;
    }
    return `${hour}:${minute}`;
  });
  cleaned = cleaned.replace(/(\d+)\s*(da|ga)/g, "$1$2");
  cleaned = normalizeAmountUnits(cleaned);
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  return cleaned;
};

const normalizeAmountUnits = (text) => {
  return text.replace(
    /(\d+(?:[\.,]\d+)?)\s*(milliard(?:lik)?|billion(?:lik)?|mlrd|million(?:lik)?|milyon(?:lik)?|mln|ming(?:lik)?|k)\b/g,
    (_, value, unit) => {
      const parsedValue = Number.parseFloat(String(value).replace(",", "."));
      if (Number.isNaN(parsedValue)) {
        return value;
      }

      const normalizedUnit = String(unit).toLowerCase();
      if (normalizedUnit.startsWith("milliard") || normalizedUnit.startsWith("billion") || normalizedUnit === "mlrd") {
        return String(Math.round(parsedValue * 1000000000));
      }
      if (normalizedUnit.startsWith("million") || normalizedUnit.startsWith("milyon") || normalizedUnit === "mln") {
        return String(Math.round(parsedValue * 1000000));
      }
      if (normalizedUnit.startsWith("ming") || normalizedUnit === "k") {
        return String(Math.round(parsedValue * 1000));
      }
      return value;
    }
  );
};

const normalizeSpacedThousands = (text) => text.replace(/\b\d{1,3}(?:\s+\d{3})+\b/g, (value) => value.replace(/\s+/g, ""));
