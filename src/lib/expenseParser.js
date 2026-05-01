import { analyzeAssistantInput } from "./assistant/parse.js";

export const parseExpenseText = (rawText) => {
  const parsed = analyzeAssistantInput(rawText);
  if (!parsed || parsed.intent !== "expense") {
    return null;
  }

  return {
    type: parsed.type,
    amount: parsed.amount,
    date: parsed.date,
    note: parsed.note || "Xarajat"
  };
};

