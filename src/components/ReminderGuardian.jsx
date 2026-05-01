import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../hooks/useNotifications";
import { useReminderEngine } from "../hooks/useReminderEngine";
import { speakAssistantText } from "../lib/speech";
import { useSettingsStore } from "../store/useSettingsStore";

const ReminderGuardian = () => {
  const { t } = useTranslation();
  const voiceEnabled = useSettingsStore((state) => state.voiceEnabled);
  const { notify } = useNotifications();

  const handleTrigger = useCallback(
    async (reminder) => {
      const reminderText = reminder.message || t("reminderReady", { title: reminder.title });
      notify(reminder.title, reminderText);

      if (!voiceEnabled) {
        return;
      }

      await speakAssistantText({
        text: reminderText,
        language: "uz"
      });
    },
    [notify, t, voiceEnabled]
  );

  useReminderEngine({ onTrigger: handleTrigger });
  return null;
};

export default ReminderGuardian;
