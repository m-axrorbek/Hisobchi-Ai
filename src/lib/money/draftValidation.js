const MISSING_AMOUNT_QUESTION = "Narx ko'rsatilmagan. Eski matnni to'g'rilab, summani ham yozib yuboring.";
const MISSING_LINE_ITEM_PRICE_QUESTION =
  "Mahsulot narxlari to'liq aytilmagan. Eski matnni to'g'rilab, har birining narxini yozib yuboring.";

export const validateResolvedMoneyDraft = (draft) => {
  if (!draft) {
    return null;
  }

  if (draft.intent === "off_topic") {
    return draft;
  }

  if (draft.intent === "clarify") {
    return normalizeClarifyDraft(draft);
  }

  if (hasMissingLineItemPrices(draft)) {
    const missingItemNames = getMissingLineItemNames(draft.line_items);

    return buildClarifyDraft({
      code: "missing_line_item_prices",
      question: missingItemNames.length
        ? `${missingItemNames.join(", ")} narxi aytilmagan. Eski matnni to'g'rilab, har birining narxini yozib yuboring.`
        : MISSING_LINE_ITEM_PRICE_QUESTION
    });
  }

  if (requiresAmount(draft) && !hasPositiveAmount(draft.amount)) {
    return buildClarifyDraft({
      code: "missing_amount",
      question: MISSING_AMOUNT_QUESTION
    });
  }

  return draft;
};

const normalizeClarifyDraft = (draft) => {
  const question = String(draft.question || "").trim();

  if (looksLikeMissingLineItemPriceQuestion(question)) {
    return buildClarifyDraft({
      ...draft,
      code: "missing_line_item_prices",
      question: MISSING_LINE_ITEM_PRICE_QUESTION
    });
  }

  if (looksLikeMissingAmountQuestion(question)) {
    return buildClarifyDraft({
      ...draft,
      code: "missing_amount",
      question: MISSING_AMOUNT_QUESTION
    });
  }

  return {
    ...draft,
    question: question || "Matnni aniqroq yozib yuboring."
  };
};

const buildClarifyDraft = ({ code = "", question = "", ...rest } = {}) => ({
  intent: "clarify",
  code,
  preserveSourceText: true,
  question,
  ...rest
});

const requiresAmount = (draft) =>
  ["expense", "debt_taken", "debt_given", "income", "debt_payment"].includes(String(draft?.type || "").trim());

const hasMissingLineItemPrices = (draft) => {
  const lineItems = Array.isArray(draft?.line_items) ? draft.line_items : [];

  if (String(draft?.type || "").trim() !== "expense" || lineItems.length < 2) {
    return false;
  }

  return lineItems.some((lineItem) => !hasPositiveAmount(lineItem?.amount));
};

const getMissingLineItemNames = (lineItems) =>
  (Array.isArray(lineItems) ? lineItems : [])
    .filter((lineItem) => !hasPositiveAmount(lineItem?.amount))
    .map((lineItem) => String(lineItem?.item || "").trim())
    .filter(Boolean);

const hasPositiveAmount = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount > 0;
};

const looksLikeMissingAmountQuestion = (question) =>
  /qancha pul|summasi qancha|to'lovi summasi|daromad summasi|pul bo'lganini|aniqlashtirib/i.test(String(question || ""));

const looksLikeMissingLineItemPriceQuestion = (question) =>
  /har birining narxi|mahsulot narxlari|narxi aytilmagan/i.test(String(question || ""));
