import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Mic, Square, Trash2, Play, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { transcribeAudio, hasUzbekVoiceKey } from "../lib/uzbekVoice";
import { cleanUzbekInput } from "../lib/cleaner";
import { warmupAudioPlayback } from "../lib/voice";

const VoiceInput = ({
  value,
  onChange,
  onSendText,
  onClearInput,
  variant = "default",
  sideAction = null,
  micLabel = null,
  forceEditor = false,
  editorPlaceholder = null
}) => {
  const { t } = useTranslation();
  const baseId = useId();
  const helperId = `${baseId}-helper`;
  const editorId = `${baseId}-editor`;
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmittingText, setIsSubmittingText] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [statusText, setStatusText] = useState("");
  const recorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const recognitionTranscriptRef = useRef("");
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(null);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canRecord = Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  const canUseBrowserSpeech = Boolean(SpeechRecognition);
  const hasRemoteStt = hasUzbekVoiceKey();

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const stopBrowserRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const resetAudio = useCallback(({ clearTranscript = false } = {}) => {
    stopPlayback();
    stopBrowserRecognition();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl("");
    setAudioBlob(null);
    recognitionTranscriptRef.current = "";
    if (clearTranscript) {
      setTranscriptPreview("");
    }
  }, [audioUrl, stopPlayback, stopBrowserRecognition]);

  useEffect(() => {
    return () => {
      stopTracks();
      stopPlayback();
      stopBrowserRecognition();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, stopPlayback, stopTracks, stopBrowserRecognition]);

  const startBrowserRecognition = useCallback(() => {
    if (!canUseBrowserSpeech) {
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "uz-UZ";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const text = Array.from(event.results)
          .map((result) => result[0]?.transcript || "")
          .join(" ")
          .trim();

        if (!text) {
          return;
        }

        const cleaned = cleanUzbekInput(text);
        recognitionTranscriptRef.current = cleaned;
        setTranscriptPreview(cleaned);
      };

      recognition.onerror = () => {
        // UzbekVoice STT stays the main path.
      };

      recognition.onend = () => {
        recognitionRef.current = null;
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (_error) {
      recognitionRef.current = null;
    }
  }, [SpeechRecognition, canUseBrowserSpeech]);

  const startRecording = async () => {
    try {
      setVoiceError("");
      setStatusText("");
      await warmupAudioPlayback();
      resetAudio();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      const recorderOptions = getRecorderOptions();
      const recorder = recorderOptions ? new MediaRecorder(stream, recorderOptions) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recognitionTranscriptRef.current = "";
      setTranscriptPreview("");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopTracks();
        stopBrowserRecognition();
        const mimeType = recorder.mimeType || recorderOptions?.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (!blob.size) {
          setVoiceError("Ovoz yozilmadi. Yana bir marta urinib ko'ring.");
          return;
        }

        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setStatusText("Yozuv tayyor. Endi matnga o'tkazing.");
      };

      recorder.start(250);
      startBrowserRecognition();
      setStatusText("Tinglanmoqda...");
      setIsRecording(true);
    } catch (error) {
      console.error(error);
      setVoiceError("Mikrofonga ruxsat bering va qayta urinib ko'ring.");
      stopTracks();
    }
  };

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const playAudio = async () => {
    if (!audioUrl) return;
    if (isPlaying) {
      stopPlayback();
      return;
    }

    try {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
      await audio.play();
    } catch (error) {
      console.error(error);
      setVoiceError("Ovozni ijro qilib bo'lmadi.");
      setIsPlaying(false);
    }
  };

  const handleTranscribe = async () => {
    if ((!audioBlob && !recognitionTranscriptRef.current) || isTranscribing || isSubmittingText) {
      return;
    }

    setIsTranscribing(true);
    setVoiceError("");
    setStatusText(hasRemoteStt ? "UzbekVoice matn chiqaryapti..." : "Matnga aylantirilmoqda...");

    try {
      let text = "";

      if (hasRemoteStt && audioBlob) {
        try {
          text = await transcribeAudio(audioBlob);
        } catch (error) {
          if (!recognitionTranscriptRef.current) {
            throw error;
          }
          text = recognitionTranscriptRef.current;
        }
      } else if (recognitionTranscriptRef.current) {
        text = recognitionTranscriptRef.current;
      } else if (audioBlob) {
        text = await transcribeAudio(audioBlob);
      }

      const cleaned = cleanUzbekInput(text);
      if (!cleaned) {
        throw new Error("EMPTY_TRANSCRIPT");
      }

      setTranscriptPreview(cleaned);
      onChange?.(cleaned);
      setStatusText("Matn tayyor. Tekshirib, keyin yuboring.");
      resetAudio();
    } catch (error) {
      console.error(error);
      setVoiceError(resolveVoiceError(error, canUseBrowserSpeech));
      setStatusText("");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmitEditedText = async () => {
    const cleaned = cleanUzbekInput(value || "");
    if (!cleaned || isSubmittingText || !onSendText) {
      return;
    }

    setIsSubmittingText(true);
    setVoiceError("");
    setStatusText("Tahrirlangan matn yuborilmoqda...");

    try {
      await warmupAudioPlayback();
      setTranscriptPreview(cleaned);
      onChange?.(cleaned);
      const result = await onSendText(cleaned);
      const clearInput = result?.clearInput ?? result?.outcome === "saved";
      const nextValue = Object.prototype.hasOwnProperty.call(result || {}, "nextValue") ? result.nextValue : null;

      setStatusText(result?.statusText || (clearInput ? "Yozuv saqlandi." : ""));
      resetAudio({ clearTranscript: clearInput });

      if (clearInput) {
        setTranscriptPreview("");
        onChange?.("");
      } else if (nextValue !== null) {
        setTranscriptPreview("");
        onChange?.(nextValue);
      }
    } catch (error) {
      console.error(error);
      setVoiceError("Matnni yuborib bo'lmadi. Qayta urinib ko'ring.");
      setStatusText("");
    } finally {
      setIsSubmittingText(false);
    }
  };

  const handleClearRecording = () => {
    setVoiceError("");
    setStatusText("");
    resetAudio({ clearTranscript: true });
    onClearInput?.();
    onChange?.("");
  };

  const micDisabled = (!hasRemoteStt && !canUseBrowserSpeech) || isTranscribing || isSubmittingText || !canRecord;
  const showEditor = forceEditor || Boolean(value?.trim());
  const helperText =
    voiceError ||
    statusText ||
    (isRecording ? t("recording") : hasRemoteStt || canUseBrowserSpeech ? t("aiReady") : t("sttMissing"));
  const showHelperText = Boolean(voiceError || statusText || isRecording || (!hasRemoteStt && !canUseBrowserSpeech));
  const micTitle = micLabel || (isRecording ? t("stopRecording") : t("startRecording"));

  if (variant === "dock") {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <div className="flex items-center justify-center gap-4">
          <div className="group relative">
            <Button
              variant={isRecording ? "secondary" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={micDisabled}
              className="h-16 w-16 rounded-full p-0"
              aria-label={micTitle}
            >
              {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink-900 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-ink-100 dark:text-ink-900">
              {micTitle}
            </span>
          </div>
          {sideAction}
        </div>

        {audioBlob ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={playAudio}
              aria-label={t("playRecording")}
              title={t("playRecording")}
              aria-pressed={isPlaying}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${
                isPlaying
                  ? "border-ink-900 bg-ink-900 text-white dark:border-ink-100 dark:bg-ink-100 dark:text-ink-900"
                  : "border-ink-200 bg-white text-ink-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
              }`}
            >
              {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleTranscribe}
              disabled={isTranscribing}
              aria-label={t("transcribeRecording")}
              title={t("transcribeRecording")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink-900 bg-ink-900 text-white disabled:opacity-50 dark:border-ink-100 dark:bg-ink-100 dark:text-ink-900"
            >
              <Send className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleClearRecording}
              aria-label={t("clearInput")}
              title={t("clearInput")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="w-full space-y-2 text-center">
          {showHelperText ? (
            <p
              id={helperId}
              className={`text-xs ${voiceError ? "text-red-500" : "text-ink-500"}`}
              role={voiceError ? "alert" : "status"}
              aria-live={voiceError ? "assertive" : "polite"}
            >
              {helperText}
            </p>
          ) : null}

          {showEditor ? (
            <div className="mx-auto max-w-sm space-y-3 rounded-2xl border border-ink-200 bg-white p-3 text-left shadow-soft dark:border-ink-700 dark:bg-ink-800">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {t("reviewTranscript")}
              </p>
              <label htmlFor={editorId} className="sr-only">
                {t("reviewTranscript")}
              </label>
              <Textarea
                id={editorId}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={3}
                className="min-h-[92px]"
                placeholder={editorPlaceholder || t("inputPlaceholder")}
                aria-describedby={helperId}
                aria-invalid={Boolean(voiceError)}
              />
              <p className="text-xs text-ink-500 dark:text-ink-400">{t("reviewTranscriptHint")}</p>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleClearRecording}>
                  <Trash2 className="h-4 w-4" /> {t("clearInput")}
                </Button>
                <Button size="sm" onClick={handleSubmitEditedText} disabled={!value?.trim() || isSubmittingText}>
                  <Send className="h-4 w-4" /> {t("submitReminder")}
                </Button>
              </div>
            </div>
          ) : transcriptPreview ? (
            <div className="mx-auto max-w-xs rounded-2xl border border-ink-200 bg-white px-3 py-2 text-left shadow-soft dark:border-ink-700 dark:bg-ink-800">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">Oxirgi matn</p>
              <p className="mt-1 text-sm text-ink-900 dark:text-ink-100">{transcriptPreview}</p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="section-title">{t("voiceInput")}</CardTitle>
        <CardDescription>{t("inputPlaceholder")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={isRecording ? "secondary" : "default"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={micDisabled}
          >
            {isRecording ? (
              <>
                <Square className="h-4 w-4" /> {t("stopRecording")}
              </>
            ) : (
              <>
              <Mic className="h-4 w-4" /> {t("startRecording")}
            </>
          )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearRecording}>
            <Trash2 className="h-4 w-4" /> {t("clearInput")}
          </Button>
          <span className={`text-sm ${voiceError ? "text-red-500" : "text-ink-500"}`} aria-hidden="true">
            {voiceError || statusText || (isRecording ? t("recording") : hasRemoteStt || canUseBrowserSpeech ? t("aiReady") : t("sttMissing"))}
          </span>
        </div>

        {audioBlob ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={playAudio} aria-pressed={isPlaying}>
              {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />} {t("playRecording")}
            </Button>
            <Button size="sm" onClick={handleTranscribe} disabled={isTranscribing}>
              <Send className="h-4 w-4" /> {t("transcribeRecording")}
            </Button>
          </div>
        ) : null}

        <label htmlFor={editorId} className="sr-only">
          {t("reviewTranscript")}
        </label>
        <Textarea
          id={editorId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={editorPlaceholder || t("inputPlaceholder")}
          aria-describedby={helperId}
          aria-invalid={Boolean(voiceError)}
        />

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleClearRecording}>
            <Trash2 className="h-4 w-4" /> {t("clearInput")}
          </Button>
          <Button size="sm" onClick={handleSubmitEditedText} disabled={!value?.trim() || isSubmittingText}>
            <Send className="h-4 w-4" /> {t("submitReminder")}
          </Button>
        </div>

        {transcriptPreview ? (
          <div className="rounded-2xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">Oxirgi matn</p>
            <p className="mt-1">{transcriptPreview}</p>
          </div>
        ) : null}

        <p
          id={helperId}
          className={`text-xs ${voiceError ? "text-red-500" : "text-ink-500"}`}
          role={voiceError ? "alert" : "status"}
          aria-live={voiceError ? "assertive" : "polite"}
        >
          {voiceError || statusText || t("reviewTranscriptHint")}
        </p>
      </CardContent>
    </Card>
  );
};

const getRecorderOptions = () => {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus"
  ];

  const supported = candidates.find((type) => MediaRecorder.isTypeSupported?.(type));
  return supported ? { mimeType: supported, audioBitsPerSecond: 128000 } : undefined;
};

const resolveVoiceError = (error, hasBrowserFallback) => {
  const message = String(error?.message || "");

  if (message === "UZBEKVOICE_TIMEOUT") {
    return "Ovoz matnga aylantirish juda cho'zildi. Qayta urinib ko'ring.";
  }
  if (message === "EMPTY_TRANSCRIPT" || message === "STT_EMPTY_RESULT") {
    return "Ovozdan tushunarli matn chiqmedi. Iltimos, yana bir marta ayting.";
  }
  if (message === "UZBEKVOICE_KEY_MISSING") {
    return hasBrowserFallback
      ? "UzbekVoice ishlamadi, brauzer orqali qayta urinib ko'ring."
      : "UzbekVoice STT kaliti yo'q.";
  }
  if (message === "EMPTY_AUDIO") {
    return "Bo'sh audio yuborildi. Yana bir marta yozib ko'ring.";
  }
  if (/unsupported|format|media/i.test(message)) {
    return "Yozilgan audio formati mos kelmadi. Qayta yozib ko'ring.";
  }
  if (/proxy|fetch failed|failed to fetch/i.test(message)) {
    return hasBrowserFallback
      ? "UzbekVoice STT ulanmayapti. Vaqtincha brauzer orqali transcript olindi."
      : "STT serveriga ulanib bo'lmadi. Qayta urinib ko'ring.";
  }

  return "Ovozni matnga aylantirib bo'lmadi. Qayta urinib ko'ring.";
};

export default VoiceInput;


