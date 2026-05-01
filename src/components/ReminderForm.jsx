import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

const ReminderForm = ({ onSubmit }) => {
  const { t } = useTranslation();
  const baseId = useId();
  const [title, setTitle] = useState("");
  const [datetime, setDatetime] = useState("");
  const [notifyBefore, setNotifyBefore] = useState(10);
  const [recurrence, setRecurrence] = useState("none");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!title || !datetime) {
      return;
    }
    onSubmit({ title, datetime, notifyBefore, recurrence });
    setTitle("");
    setDatetime("");
    setNotifyBefore(10);
    setRecurrence("none");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="section-title">{t("addReminder")}</CardTitle>
        <CardDescription>{t("dateTime")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor={`${baseId}-title`} className="text-sm text-ink-600">{t("title")}</label>
            <Input id={`${baseId}-title`} value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <label htmlFor={`${baseId}-datetime`} className="text-sm text-ink-600">{t("dateTime")}</label>
            <Input
              id={`${baseId}-datetime`}
              type="datetime-local"
              value={datetime}
              onChange={(event) => setDatetime(event.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor={`${baseId}-notify-before`} className="text-sm text-ink-600">{t("notifyBefore")}</label>
            <Input
              id={`${baseId}-notify-before`}
              type="number"
              min={1}
              value={notifyBefore}
              onChange={(event) => setNotifyBefore(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor={`${baseId}-recurrence`} className="text-sm text-ink-600">{t("recurrence")}</label>
            <select
              id={`${baseId}-recurrence`}
              className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
              value={recurrence}
              onChange={(event) => setRecurrence(event.target.value)}
            >
              <option value="none">{t("recurrenceNone")}</option>
              <option value="daily">{t("recurrenceDaily")}</option>
              <option value="weekly">{t("recurrenceWeekly")}</option>
            </select>
          </div>
        </div>
        <Button type="submit">{t("addReminder")}</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReminderForm;
