import { addDays, addWeeks, format, isSameDay, parseISO } from "date-fns";

export const formatDateTime = (iso) => {
  return format(parseISO(iso), "dd MMM, HH:mm");
};

export const isToday = (iso) => {
  return isSameDay(parseISO(iso), new Date());
};

export const getNextOccurrence = (iso, recurrence) => {
  const date = parseISO(iso);
  if (recurrence === "daily") {
    return addDays(date, 1).toISOString();
  }
  if (recurrence === "weekly") {
    return addWeeks(date, 1).toISOString();
  }
  return iso;
};
