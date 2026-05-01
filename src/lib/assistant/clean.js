import { cleanUzbekInput } from "../cleaner.js";

const fillerRegex = /\b(uka|qara|iltimos|mayli|xo'p|xop|xo‘p|yaxshi)\b/g;

export const cleanAssistantInput = (input) => {
  const normalized = cleanUzbekInput(input || "");

  return normalized
    .replace(fillerRegex, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

