import { analyzeAssistantInput } from "../../../../src/lib/assistant/parse.js";
import {
  buildMoneyAssistantMessages,
  normalizeMoneyPayload,
  sanitizeJsonText
} from "../../../../src/lib/assistant/openAiPrompt.js";
import { env } from "../../config/env.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export const assistantService = {
  async analyze(text) {
    const localResult = analyzeAssistantInput(text);

    if (!env.openAiApiKey) {
      return localResult;
    }

    try {
      const completion = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.openAiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.openAiModel,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: buildMoneyAssistantMessages(text)
        })
      });

      if (!completion.ok) {
        throw new Error("OPENAI_ANALYZE_FAILED");
      }

      const data = await completion.json();
      const content = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(sanitizeJsonText(content));
      return normalizeMoneyPayload(parsed) || localResult;
    } catch (_error) {
      return localResult;
    }
  }
};
