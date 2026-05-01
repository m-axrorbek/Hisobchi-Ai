import { analyzeAssistantInput } from "../../src/lib/assistant/parse.js";
import {
  buildMoneyAssistantMessages,
  normalizeMoneyPayload,
  sanitizeJsonText
} from "../../src/lib/assistant/openAiPrompt.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ message: "METHOD_NOT_ALLOWED" });
  }

  const text = String(request.body?.text || "").trim();
  if (!text) {
    return response.status(400).json({ message: "TEXT_REQUIRED" });
  }

  const localResult = analyzeAssistantInput(text);
  const apiKey = process.env.OPENAI_API_KEY || "";

  if (!apiKey) {
    return response.json(localResult);
  }

  try {
    const completion = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: buildMoneyAssistantMessages(text)
      })
    });

    if (!completion.ok) {
      const errorText = await completion.text();
      console.error("OpenAI analyze failed:", errorText);
      return response.json(localResult);
    }

    const data = await completion.json();
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(sanitizeJsonText(content));
    const normalized = normalizeMoneyPayload(parsed);

    return response.json(normalized || localResult);
  } catch (error) {
    console.error("Assistant analyze fallback:", error);
    return response.json(localResult);
  }
}
