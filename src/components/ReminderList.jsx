import { useTranslation } from "react-i18next";
import { Trash2, Calendar, Clock, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useReminderStore } from "../store/useReminderStore";
import { formatDateTime } from "../lib/time";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const ReminderList = () => {
  const { t } = useTranslation();
  const reminders = useReminderStore((state) => state.reminders);
  const removeReminder = useReminderStore((state) => state.removeReminder);
  const updateReminder = useReminderStore((state) => state.updateReminder);

  const handleToggle = (id, completed) => {
    updateReminder(id, { completed });
  };

  const handleDelete = (id) => {
    removeReminder(id);
  };

  if (!reminders || reminders.length === 0) {
    return (
      <Card className="border-dashed bg-transparent dark:border-ink-700">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-ink-100 p-3 dark:bg-ink-800">
            <Calendar className="h-6 w-6 text-ink-400 dark:text-ink-500" />
          </div>
          <p className="mt-4 text-base font-semibold text-ink-900 dark:text-ink-200">
            {t("noReminders")}
          </p>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {t("emptyReminderHint")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-soft backdrop-blur-sm dark:border dark:border-ink-800/50 dark:bg-ink-900/50">
      <CardHeader className="border-b border-ink-100 pb-4 dark:border-ink-800/50">
        <CardTitle className="section-title text-xl font-bold dark:text-ink-100">
          {t("upcoming")}
        </CardTitle>
        <CardDescription className="dark:text-ink-400">
          {t("upcomingHint")}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden p-4 sm:p-6">
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {reminders.map((reminder) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                key={reminder.id}
                className={`group flex flex-col justify-between gap-4 rounded-xl border p-4 transition-all duration-300 hover:shadow-md sm:flex-row sm:items-center ${
                  reminder.completed
                    ? "border-ink-200 bg-ink-50/50 opacity-60 dark:border-ink-800 dark:bg-ink-900/30"
                    : "border-ink-200 bg-white hover:border-ink-300 dark:border-ink-700 dark:bg-ink-800 dark:hover:border-ink-600"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={reminder.completed}
                      onChange={(event) => handleToggle(reminder.id, event.target.checked)}
                      className="h-5 w-5 cursor-pointer rounded border-ink-300 text-ink-900 transition-colors focus:ring-ink-400 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 dark:checked:bg-ink-100"
                      aria-label={`${reminder.title} eslatmasini bajarildi deb belgilash`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p
                      className={`font-semibold transition-all duration-300 ${
                        reminder.completed
                          ? "text-ink-500 line-through dark:text-ink-400"
                          : "text-ink-900 dark:text-ink-200"
                      }`}
                    >
                      {reminder.title}
                    </p>
                    {reminder.sourceText ? (
                      <p className="max-w-[34rem] text-sm text-ink-500 dark:text-ink-400">
                        {reminder.sourceText}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
                      <div className="flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-ink-600 dark:bg-ink-900 dark:text-ink-300">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDateTime(reminder.datetime)}</span>
                      </div>

                      {reminder.recurrence && reminder.recurrence !== "none" ? (
                        <div className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-100 px-2.5 py-1 text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300">
                          <RotateCw className="h-3.5 w-3.5" />
                          <span>{reminder.recurrence === "daily" ? t("recurrenceDaily") : t("recurrenceWeekly")}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(reminder.id)}
                    className="h-9 w-9 rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-ink-100"
                    aria-label={`${reminder.title} eslatmasini o'chirish`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReminderList;
