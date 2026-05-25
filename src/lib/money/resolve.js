import { assistantApi } from "../api.js";
import { extractDateTimeParts } from "../assistant/datetime.js";
import { analyzeAssistantInput, assistantResultToLegacyDrafts } from "../parser.js";
import { normalizeMoneyDraftCurrency } from "./currency.js";
import { validateResolvedMoneyDraft } from "./draftValidation.js";

export const resolveMoneyDrafts = async (text) => {
  const now = new Date();
  const localResult = analyzeAssistantInput(text, { now });

  try {
    const aiResult = await assistantApi.analyze(text);
    const preferred = choosePreferredAssistantResult(aiResult, localResult);
    return finalizeAssistantResult(preferred, text, { now, localResult });
  } catch (_error) {
    return finalizeAssistantResult(localResult, text, { now, localResult });
  }
};

const finalizeAssistantResult = async (assistantResult, sourceText, options = {}) => {
  const drafts = assistantResultToLegacyDrafts(assistantResult);
  const localDrafts = assistantResultToLegacyDrafts(options.localResult);
  return Promise.all(
    drafts.map((draft, index) =>
      finalizeResolvedDraft(draft, sourceText, {
        ...options,
        localDraft: localDrafts[index]
      })
    )
  );
};

const finalizeResolvedDraft = async (draft, sourceText, options = {}) => {
  const normalizedDraft = await normalizeMoneyDraftCurrency(
    applyClientDateTime(draft, sourceText, options.now, options.localDraft),
    sourceText
  );
  return validateResolvedMoneyDraft(normalizedDraft);
};

const applyClientDateTime = (draft, sourceText, now = new Date(), localDraft = null) => {
  if (!draft?.type) {
    return draft;
  }

  const dateTime =
    getDraftDateTime(localDraft) ||
    extractDateTimeParts(sourceText, {
      now,
      defaultToCurrentTime: true
    });

  return {
    ...draft,
    date: dateTime.date,
    time: dateTime.time,
    created_at: "",
    updated_at: ""
  };
};

const getDraftDateTime = (draft) => {
  if (!draft?.type || !isDateString(draft.date) || !isTimeString(draft.time)) {
    return null;
  }

  return {
    date: draft.date,
    time: draft.time
  };
};

const isDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());

const isTimeString = (value) => /^\d{2}:\d{2}$/.test(String(value || "").trim());

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
