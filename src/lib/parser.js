import { analyzeAssistantInput, splitAssistantSegments } from "./assistant/parse.js";

export const parseMoneyText = (text) =>
  splitAssistantSegments(text)
    .map((segment) => analyzeAssistantInput(segment))
    .filter(Boolean);

export { analyzeAssistantInput, splitAssistantSegments };
