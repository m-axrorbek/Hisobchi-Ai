import { assistantApi } from "../api.js";
import { analyzeAssistantInput, assistantResultToLegacyDrafts } from "../parser.js";
import { normalizeMoneyDraftCurrency } from "./currency.js";
import { validateResolvedMoneyDraft } from "./draftValidation.js";

export const resolveMoneyDrafts = async (text) => {
  const localResult = analyzeAssistantInput(text);

  try {
    const aiResult = await assistantApi.analyze(text);
    const preferred = choosePreferredAssistantResult(aiResult, localResult);
    return finalizeAssistantResult(preferred, text);
  } catch (_error) {
    return finalizeAssistantResult(localResult, text);
  }
};

const finalizeAssistantResult = async (assistantResult, sourceText) => {
  const drafts = assistantResultToLegacyDrafts(assistantResult);
  return Promise.all(drafts.map((draft) => finalizeResolvedDraft(draft, sourceText)));
};

const finalizeResolvedDraft = async (draft, sourceText) => {
  const normalizedDraft = await normalizeMoneyDraftCurrency(draft, sourceText);
  return validateResolvedMoneyDraft(normalizedDraft);
};

const choosePreferredAssistantResult = (aiResult, localResult) => {
  if (hasUsefulAssistantRecords(aiResult)) {
    return aiResult;
  }

  if (hasUsefulAssistantRecords(localResult)) {
    return localResult;
  }

  return aiResult || localResult;
};

const hasUsefulAssistantRecords = (result) =>
  Boolean(result && (result.needs_confirmation || (Array.isArray(result.records) && result.records.length)));
