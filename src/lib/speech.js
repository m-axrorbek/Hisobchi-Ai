import { hasUzbekVoiceTtsKey, synthesizeSpeech } from "./uzbekVoice";
import { playAudioSource, speakWithWebApi } from "./voice";

export const getSpeechLang = () => "uz-UZ";

export const speakAssistantText = async ({ text, language = "uz" }) => {
  if (!text?.trim()) {
    return false;
  }

  if (hasUzbekVoiceTtsKey()) {
    try {
      const audioSource = await synthesizeSpeech(text);
      await playAudioSource(audioSource);
      return true;
    } catch (error) {
      console.warn("KOTIBA AI UzbekVoice TTS failed:", error);
      return false;
    }
  }

  return speakWithWebApi(text, getSpeechLang(language));
};
