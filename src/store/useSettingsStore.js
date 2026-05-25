import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useSettingsStore = create()(
  persist(
    (set) => ({
      settingsOpen: false,
      panelMode: "settings",
      activeTab: "appearance",
      openSettings: (activeTab = "appearance", panelMode = "settings") =>
        set({
          settingsOpen: true,
          activeTab,
          panelMode
        }),
      setActiveTab: (activeTab) => set({ activeTab }),
      closeSettings: () =>
        set({
          settingsOpen: false,
          panelMode: "settings",
          activeTab: "appearance"
        })
    }),
    {
      name: "kotiba-settings"
    }
  )
);
