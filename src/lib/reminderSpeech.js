import { speakAssistantText, getSpeechLang } from "./speech";

export const announceCreatedReminders = async ({ reminders, voiceEnabled, language, t }) => {
  if (!voiceEnabled || !Array.isArray(reminders) || reminders.length === 0) {
    return false;
  }

  const speechText = buildReminderCreatedSpeech(reminders, language, t);
  return speakAssistantText({ text: speechText, language });
};

export const buildReminderCreatedSpeech = (reminders, language, t) => {
  if (reminders.length === 1) {
    const reminder = reminders[0];
    return t("reminderCreatedVoice", {
      title: reminder.title,
      datetime: formatReminderSpeechDate(reminder.datetime, language)
    });
  }

  const titles = reminders
    .map((reminder) => reminder.title)
    .filter(Boolean)
    .join(", ");

  return t("remindersCreatedVoice", {
    count: reminders.length,
    titles
  });
};

export const formatReminderSpeechDate = (value, language) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(getSpeechLang(language), {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};
