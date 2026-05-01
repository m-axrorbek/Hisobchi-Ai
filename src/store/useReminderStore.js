import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useReminderStore = create()(
  persist(
    (set) => ({
      reminders: [],
      setReminders: (reminders) => set({ reminders }),
      addReminder: (reminder) =>
        set((state) => ({ reminders: [reminder, ...state.reminders] })),
      addReminders: (reminders) =>
        set((state) => ({ reminders: [...reminders, ...state.reminders] })),
      updateReminder: (id, update) =>
        set((state) => ({
          reminders: state.reminders.map((reminder) =>
            reminder.id === id ? { ...reminder, ...update } : reminder
          )
        })),
      removeReminder: (id) =>
        set((state) => ({
          reminders: state.reminders.filter((reminder) => reminder.id !== id)
        })),
      clearAll: () => set({ reminders: [] })
    }),
    {
      name: "kotiba-reminders",
      version: 1
    }
  )
);
