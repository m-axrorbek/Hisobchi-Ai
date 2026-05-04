import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../hooks/useNotifications";
import { useReminderEngine } from "../hooks/useReminderEngine";

const ReminderGuardian = () => {
  const { t } = useTranslation();
  const { notify } = useNotifications();

  const handleTrigger = useCallback(
    async (reminder) => {
      const reminderText = reminder.message || t("reminderReady", { title: reminder.title });
      notify(reminder.title, reminderText);
    },
    [notify, t]
  );

  useReminderEngine({ onTrigger: handleTrigger });
  return null;
};

export default ReminderGuardian;
