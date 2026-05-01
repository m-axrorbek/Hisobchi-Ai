let activeAudio = null;
let audioUnlocked = false;
let pendingSource = null;

const SILENT_AUDIO =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

const stopActiveAudio = () => {
  if (!activeAudio) {
    return;
  }

  activeAudio.pause();
  activeAudio.currentTime = 0;
  if (activeAudio.dataset.objectUrl === "true") {
    URL.revokeObjectURL(activeAudio.src);
  }
  activeAudio = null;
};

export const warmupAudioPlayback = async () => {
  if (audioUnlocked) {
    return true;
  }

  const audio = new Audio(SILENT_AUDIO);
  audio.muted = true;

  try {
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audioUnlocked = true;
    return true;
  } catch (_error) {
    return false;
  }
};

const bindUnlockListeners = () => {
  const unlock = async () => {
    try {
      await warmupAudioPlayback();

      if (pendingSource) {
        const source = pendingSource;
        pendingSource = null;
        await playAudioSource(source);
      }
    } catch (_error) {
      // Wait for the next user interaction.
    }
  };

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
};

export const playAudioSource = async (source) => {
  if (!source) {
    return false;
  }

  stopActiveAudio();
  window.speechSynthesis?.cancel?.();

  const audio = new Audio();
  audio.preload = "auto";
  if (typeof source === "string") {
    audio.src = source;
  } else {
    audio.src = URL.createObjectURL(source);
    audio.dataset.objectUrl = "true";
  }

  activeAudio = audio;

  try {
    await audio.play();
    audioUnlocked = true;
  } catch (error) {
    pendingSource = source;
    bindUnlockListeners();
    throw error;
  }

  audio.onended = () => {
    if (audio.dataset.objectUrl === "true") {
      URL.revokeObjectURL(audio.src);
    }
    if (activeAudio === audio) {
      activeAudio = null;
    }
  };

  return true;
};

export const speakWithWebApi = (text, lang = "uz-UZ") => {
  if (!("speechSynthesis" in window) || !text?.trim()) {
    return false;
  }

  stopActiveAudio();
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
  return true;
};

export const stopSpeaking = () => {
  stopActiveAudio();
  window.speechSynthesis?.cancel?.();
};
