import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Mic, Square, Trash2, Play, Send, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { transcribeAudio, hasUzbekVoiceKey } from "../lib/uzbekVoice";
import { cleanUzbekInput } from "../lib/cleaner";

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
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  const canRecord = Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  const canUploadAudio = Boolean(window.File && window.FormData);
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

  const resetAudio = useCallback(({ clearTranscript = false } = {}) => {
    stopPlayback();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setAudioUrl("");
    setAudioBlob(null);
    setRecordingDuration(0);
    if (clearTranscript) {
      setTranscriptPreview("");
    }
  }, [audioUrl, stopPlayback]);

  useEffect(() => {
    if (!isRecording) {
      return undefined;
    }

    const startedAt = Date.now();
    setRecordingDuration(0);

    const intervalId = window.setInterval(() => {
      setRecordingDuration(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      stopTracks();
      stopPlayback();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, stopPlayback, stopTracks]);

  const startRecording = async () => {
    try {
      if (!window.isSecureContext) {
        throw new Error("INSECURE_CONTEXT");
      }
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error("RECORDER_UNAVAILABLE");
      }

      setVoiceError("");
      setStatusText("");
      resetAudio();
      setRecordingDuration(0);
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
      setTranscriptPreview("");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setVoiceError("Ovoz yozishni boshlab bo'lmadi. Safari yoki Chrome da qayta urinib ko'ring.");
        setStatusText("");
        setIsRecording(false);
        stopTracks();
      };

      recorder.onstop = () => {
        stopTracks();
        recorderRef.current = null;
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

      recorder.start();
      setStatusText("Tinglanmoqda...");
      setIsRecording(true);
    } catch (error) {
      console.error(error);
      setVoiceError(resolveRecordingError(error));
      setStatusText("");
      setIsRecording(false);
      stopTracks();
    }
  };

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      try {
        recorderRef.current.requestData?.();
      } catch (_error) {
        // Some mobile browsers do not support requestData during stop.
      }
      recorderRef.current.stop();
      setStatusText("Yozuv yakunlanmoqda...");
    }
    setIsRecording(false);
  }, []);

  const selectAudioFile = () => {
    fileInputRef.current?.click();
  };

  const handleAudioFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setVoiceError("");
    setStatusText("");
    resetAudio();
    setTranscriptPreview("");

    if (!file.size) {
      setVoiceError("Tanlangan audio bo'sh. Boshqa fayl tanlang yoki qayta yozib ko'ring.");
      return;
    }

    const url = URL.createObjectURL(file);
    setAudioBlob(file);
    setAudioUrl(url);
    setStatusText("Audio tayyor. Endi matnga o'tkazing.");
  };

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
    if (!audioBlob || isTranscribing || isSubmittingText) {
      return;
    }

    setIsTranscribing(true);
    setVoiceError("");
    setStatusText(hasRemoteStt ? "UzbekVoice matn chiqaryapti..." : "Matnga aylantirilmoqda...");

    try {
      const text = await transcribeAudio(audioBlob);
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
      setVoiceError(resolveVoiceError(error));
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

  const micDisabled = !hasRemoteStt || isTranscribing || isSubmittingText || !canRecord;
  const uploadDisabled = !hasRemoteStt || isTranscribing || isSubmittingText || !canUploadAudio;
  const showEditor = forceEditor || Boolean(value?.trim());
  const hasRecordedAudio = Boolean(audioBlob && !isRecording);
  const fallbackHelperText =
    hasRemoteStt && !canRecord && canUploadAudio ? t("audioUploadHint") : hasRemoteStt ? t("aiReady") : t("sttMissing");
  const helperText =
    voiceError || statusText || (isRecording ? t("recording") : fallbackHelperText);
  const showHelperText = Boolean(voiceError || statusText || isRecording || !hasRemoteStt || !canRecord);
  const micTitle = micLabel || (isRecording ? t("stopRecording") : t("startRecording"));

  if (variant === "dock") {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept={AUDIO_FILE_ACCEPT}
          capture="user"
          className="sr-only"
          onChange={handleAudioFileChange}
        />
        <div className="flex items-center justify-center gap-4">
          <div className="group relative">
            {isRecording ? <span className="absolute inset-[-10px] rounded-full bg-red-500/20 animate-ping" aria-hidden="true" /> : null}
            <Button
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={micDisabled}
              className={`relative h-16 w-16 rounded-full p-0 ${isRecording ? "shadow-[0_0_0_8px_rgba(239,68,68,0.14)]" : ""}`}
              aria-label={micTitle}
              aria-pressed={isRecording}
            >
              {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            {!isRecording ? (
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink-900 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-soft transition-opacity group-hover:opacity-100 dark:bg-ink-100 dark:text-ink-900">
                {micTitle}
              </span>
            ) : null}
          </div>
          {!isRecording ? (
            <>
              <div className="group relative">
                <Button
                  type="button"
                  variant="outline"
                  onClick={selectAudioFile}
                  disabled={uploadDisabled}
                  className="h-16 w-16 rounded-full p-0"
                  aria-label={t("uploadAudio")}
                >
                  <Upload className="h-5 w-5" />
                </Button>
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink-900 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-soft transition-opacity group-hover:opacity-100 dark:bg-ink-100 dark:text-ink-900">
                  {t("uploadAudio")}
                </span>
              </div>
              {sideAction}
            </>
          ) : null}
        </div>

        {isRecording ? (
          <div className="inline-flex items-center gap-3 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-red-700 shadow-soft dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">REC {formatRecordingDuration(recordingDuration)}</span>
            <span className="text-sm font-medium">Ovoz yozilyapti</span>
          </div>
        ) : null}

        {audioBlob ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
              <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              Yozuv tayyor
            </span>
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
          ) : transcriptPreview || hasRecordedAudio ? (
            <div className="mx-auto max-w-xs rounded-2xl border border-ink-200 bg-white px-3 py-2 text-left shadow-soft dark:border-ink-700 dark:bg-ink-800">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {transcriptPreview ? "Oxirgi matn" : "Audio holati"}
              </p>
              <p className="mt-1 text-sm text-ink-900 dark:text-ink-100">
                {transcriptPreview || "Audio yozib olindi. Matnga o'tkazish uchun yuborishni bosing."}
              </p>
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
        <input
          ref={fileInputRef}
          type="file"
          accept={AUDIO_FILE_ACCEPT}
          capture="user"
          className="sr-only"
          onChange={handleAudioFileChange}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={isRecording ? "destructive" : "default"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={micDisabled}
            className={isRecording ? "shadow-[0_0_0_8px_rgba(239,68,68,0.14)]" : ""}
            aria-pressed={isRecording}
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
          {!isRecording ? (
            <>
              <Button variant="outline" size="sm" onClick={selectAudioFile} disabled={uploadDisabled}>
                <Upload className="h-4 w-4" /> {t("uploadAudio")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearRecording}>
                <Trash2 className="h-4 w-4" /> {t("clearInput")}
              </Button>
              <span className={`text-sm ${voiceError ? "text-red-500" : "text-ink-500"}`} aria-hidden="true">
                {voiceError || statusText || fallbackHelperText}
              </span>
            </>
          ) : (
            <div className="inline-flex items-center gap-3 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">REC {formatRecordingDuration(recordingDuration)}</span>
              <span className="text-sm font-medium">Ovoz yozilyapti</span>
            </div>
          )}
        </div>

        {audioBlob ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
              <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              Yozuv tayyor
            </span>
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

        {transcriptPreview || hasRecordedAudio ? (
          <div className="rounded-2xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
              {transcriptPreview ? "Oxirgi matn" : "Audio holati"}
            </p>
            <p className="mt-1">{transcriptPreview || "Audio yozib olindi. Endi matnga o'tkazishingiz mumkin."}</p>
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

const AUDIO_FILE_ACCEPT = "audio/*,.m4a,.mp3,.mp4,.wav,.ogg,.webm,.aac,.3gp";

const getRecorderOptions = () => {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus"
  ];

  const supported = candidates.find((type) => MediaRecorder.isTypeSupported?.(type));
  return supported ? { mimeType: supported, audioBitsPerSecond: 128000 } : undefined;
};

const resolveRecordingError = (error) => {
  const message = String(error?.message || "");
  const name = String(error?.name || "");

  if (message === "INSECURE_CONTEXT") {
    return "Telefon mikrofoni uchun sayt HTTPS orqali ochilishi kerak.";
  }
  if (message === "RECORDER_UNAVAILABLE") {
    return "Bu brauzer ovoz yozishni qo'llamayapti. Safari yoki Chrome da ochib ko'ring.";
  }
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Mikrofon ruxsatini yoqing va qayta urinib ko'ring.";
  }
  if (name === "NotFoundError") {
    return "Mikrofon topilmadi.";
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return "Telefon mikrofoni band yoki yozuvni boshlab bo'lmadi. Boshqa ilovani yoping va qayta urinib ko'ring.";
  }
  if (name === "SecurityError") {
    return "Mikrofon uchun sahifani oddiy brauzerda oching. Ilova ichidagi brauzerlar xato berishi mumkin.";
  }

  return "Ovoz yozishni boshlab bo'lmadi. Safari yoki Chrome da qayta urinib ko'ring.";
};

const resolveVoiceError = (error) => {
  const message = String(error?.message || "");

  if (message === "UZBEKVOICE_TIMEOUT") {
    return "Ovoz matnga aylantirish juda cho'zildi. Qayta urinib ko'ring.";
  }
  if (message === "EMPTY_TRANSCRIPT" || message === "STT_EMPTY_RESULT") {
    return "Ovozdan tushunarli matn chiqmedi. Iltimos, yana bir marta ayting.";
  }
  if (message === "UZBEKVOICE_KEY_MISSING") {
    return "UzbekVoice STT kaliti topilmadi. Sozlamani tekshirib qayta urinib ko'ring.";
  }
  if (message === "UZBEKVOICE_SERVER_KEY_MISSING") {
    return "Vercel serverida UzbekVoice STT kaliti yo'q. UZBEKVOICE_API_KEY environment variable qo'shib, qayta deploy qiling.";
  }
  if (message === "EMPTY_AUDIO") {
    return "Bo'sh audio yuborildi. Yana bir marta yozib ko'ring.";
  }
  if (/unsupported|format|media/i.test(message)) {
    return "Yozilgan audio formati mos kelmadi. Qayta yozib ko'ring.";
  }
  if (/proxy|fetch failed|failed to fetch/i.test(message)) {
    return "STT serveriga ulanib bo'lmadi. Telefoningizda internetni va Vercel deploy'ni tekshirib qayta urinib ko'ring.";
  }

  return "Ovozni matnga aylantirib bo'lmadi. Qayta urinib ko'ring.";
};

const formatRecordingDuration = (seconds) => {
  const safeSeconds = Math.max(Number(seconds || 0), 0);
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const remainder = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
};

export default VoiceInput;


