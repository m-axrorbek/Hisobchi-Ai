import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useSettingsStore = create()(
  persist(
    (set) => ({
      voiceEnabled: true,
      settingsOpen: false,
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false })
    }),
    {
      name: "kotiba-settings"
    }
  )
);
