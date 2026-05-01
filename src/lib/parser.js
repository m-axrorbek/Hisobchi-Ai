import { analyzeAssistantInput, assistantResultToLegacyDrafts, splitAssistantSegments } from "./assistant/parse.js";

export const parseMoneyText = (text) => analyzeAssistantInput(text);

export { analyzeAssistantInput, assistantResultToLegacyDrafts, splitAssistantSegments };
