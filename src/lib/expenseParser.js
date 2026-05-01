import { analyzeAssistantInput } from "./assistant/parse.js";

export const parseExpenseText = (rawText) => {
  const parsed = analyzeAssistantInput(rawText);
  if (!parsed || parsed.needs_confirmation) {
    return null;
  }

  const expenseRecord = (parsed.records || []).find((record) => record.type === "expense");
  if (!expenseRecord) {
    return null;
  }

  return {
    type: expenseRecord.type,
    amount: expenseRecord.amount,
    date: expenseRecord.date,
    note: expenseRecord.note || expenseRecord.item || "Xarajat"
  };
};
