import { assistantApi } from "../api.js";
import { analyzeAssistantInput, splitAssistantSegments } from "../parser.js";
import { normalizeMoneyDraftCurrency } from "./currency.js";

export const resolveMoneyDrafts = async (text) => {
  const segments = splitAssistantSegments(text);
  const localPairs = segments
    .map((segment) => ({
      segment,
      draft: analyzeAssistantInput(segment)
    }))
    .filter(({ draft }) => Boolean(draft));

  if (segments.length !== 1 || !localPairs.length) {
    return Promise.all(localPairs.map(({ draft, segment }) => normalizeMoneyDraftCurrency(draft, segment)));
  }

  const [{ draft: localDraft, segment }] = localPairs;

  try {
    const aiDraft = await assistantApi.analyze(text);
    return [await normalizeMoneyDraftCurrency(mergeMoneyDrafts(aiDraft, localDraft), segment)];
  } catch (_error) {
    return [await normalizeMoneyDraftCurrency(localDraft, segment)];
  }
};

export const mergeMoneyDrafts = (aiDraft, localDraft) => {
  if (!aiDraft || aiDraft.intent === "clarify" || aiDraft.intent === "off_topic") {
    return aiDraft || localDraft;
  }

  if (!localDraft || localDraft.intent === "off_topic") {
    return aiDraft;
  }

  const mergedQuantity = resolveMergedQuantity(localDraft.quantity, aiDraft.quantity);
  const mergedLineItems = resolveMergedLineItems(localDraft.line_items, aiDraft.line_items);

  return {
    ...localDraft,
    intent: aiDraft.intent || localDraft.intent,
    type: localDraft.type || aiDraft.type,
    item: mergedLineItems.length > 1 ? localDraft.item || aiDraft.item : aiDraft.item || localDraft.item,
    quantity: mergedQuantity,
    unit_price: localDraft.unit_price || aiDraft.unit_price || 0,
    amount: localDraft.amount || aiDraft.amount,
    line_items: mergedLineItems,
    category: aiDraft.category || localDraft.category,
    person: aiDraft.person || localDraft.person,
    store: aiDraft.store || localDraft.store,
    payment_status: localDraft.payment_status || aiDraft.payment_status,
    paid_amount: localDraft.paid_amount ?? aiDraft.paid_amount ?? 0,
    remaining_amount: localDraft.remaining_amount ?? aiDraft.remaining_amount ?? 0,
    date: localDraft.date || aiDraft.date,
    time: localDraft.time || aiDraft.time,
    note: localDraft.note || aiDraft.note,
    payment_direction: localDraft.payment_direction || aiDraft.payment_direction
  };
};

const resolveMergedQuantity = (localQuantity, aiQuantity) => {
  const normalizedLocal = Number(localQuantity || 0);
  const normalizedAi = Number(aiQuantity || 0);

  if (Number.isFinite(normalizedLocal) && normalizedLocal > 1) {
    return normalizedLocal;
  }

  if (Number.isFinite(normalizedAi) && normalizedAi > 1) {
    return normalizedAi;
  }

  if (Number.isFinite(normalizedLocal) && normalizedLocal > 0) {
    return normalizedLocal;
  }

  if (Number.isFinite(normalizedAi) && normalizedAi > 0) {
    return normalizedAi;
  }

  return 1;
};

const resolveMergedLineItems = (localLineItems, aiLineItems) => {
  const normalizedLocal = Array.isArray(localLineItems) ? localLineItems.filter((entry) => entry?.item) : [];
  const normalizedAi = Array.isArray(aiLineItems) ? aiLineItems.filter((entry) => entry?.item) : [];

  if (normalizedLocal.length > 1) {
    return normalizedLocal;
  }

  if (normalizedAi.length > 1) {
    return normalizedAi;
  }

  if (normalizedLocal.length) {
    return normalizedLocal;
  }

  return normalizedAi;
};
