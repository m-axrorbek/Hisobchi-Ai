const STT_ENDPOINT = import.meta.env.VITE_UZBEKVOICE_STT_URL || "/api/uzbekvoice/stt";

const AUDIO_EXTENSION_BY_TYPE = {
  "audio/webm": "webm",
  "audio/webm;codecs=opus": "webm",
  "audio/ogg": "ogg",
  "audio/ogg;codecs=opus": "ogg",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3"
};

export const hasUzbekVoiceKey = () => Boolean(String(STT_ENDPOINT || "").trim());

const getAudioFilename = (blob) => {
  const extension = AUDIO_EXTENSION_BY_TYPE[blob?.type] || "webm";
  return `audio.${extension}`;
};

const normalizeTranscript = (text) => {
  return String(text || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\bsoat\s+(\d{1,2})\s+(\d{2})\b/gi, "soat $1:$2")
    .trim();
};

const readErrorMessage = async (response) => {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw);
    return parsed.message || raw;
  } catch (_error) {
    return raw;
  }
};

export const transcribeAudio = async (blob) => {
  if (!STT_ENDPOINT) {
    throw new Error("UZBEKVOICE_KEY_MISSING");
  }

  if (!blob || blob.size === 0) {
    throw new Error("EMPTY_AUDIO");
  }

  const form = new FormData();
  form.append("file", blob, getAudioFilename(blob));
  form.append("return_offsets", "false");
  form.append("run_diarization", "false");
  form.append("language", "uz");
  form.append("blocking", "true");
  form.append("webhook_notification_url", "");

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 45000);

  let response;
  try {
    response = await fetch(STT_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json"
      },
      body: form,
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("UZBEKVOICE_TIMEOUT");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await readErrorMessage(response);
    throw new Error(errorText || "UZBEKVOICE_STT_FAILED");
  }

  const data = await response.json();
  const transcript = normalizeTranscript(
    data.text || data.result?.text || data.result?.utterance || data.data?.text || data.transcript || ""
  );

  if (!transcript) {
    throw new Error("STT_EMPTY_RESULT");
  }

  return transcript;
};
