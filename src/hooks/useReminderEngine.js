import { useEffect } from "react";
import { parseISO } from "date-fns";
import { useReminderStore } from "../store/useReminderStore";
import { getNextOccurrence } from "../lib/time";

export const useReminderEngine = ({ intervalMs = 5000, onTrigger }) => {
  const reminders = useReminderStore((state) => state.reminders);
  const updateReminder = useReminderStore((state) => state.updateReminder);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      reminders.forEach((reminder) => {
        if (reminder.notified || reminder.completed) {
          return;
        }

        const target = parseISO(reminder.datetime).getTime();
        const notifyBefore = Number(reminder.notifyBefore ?? 0) || 0;
        const notifyAt = target - notifyBefore * 60 * 1000;
        const gracePeriod = target + 5 * 60 * 1000;

        if (now >= notifyAt && now <= gracePeriod) {
          void onTrigger(reminder);

          if (reminder.recurrence !== "none") {
            const next = getNextOccurrence(reminder.datetime, reminder.recurrence);
            updateReminder(reminder.id, {
              datetime: next,
              notified: false,
              lastNotifiedAt: new Date().toISOString()
            });
          } else {
            updateReminder(reminder.id, {
              notified: true,
              lastNotifiedAt: new Date().toISOString()
            });
          }
        }
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs, onTrigger, reminders, updateReminder]);
};
