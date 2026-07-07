import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  saveAppSettings,
  type AppSettings,
  type SettingsSectionId,
} from "../mock/settingsDemo";

type MockSettingsContextValue = {
  settings: AppSettings;
  activeSection: SettingsSectionId;
  setActiveSection: (section: SettingsSectionId) => void;
  updateSettings: <K extends keyof AppSettings>(
    section: K,
    patch: Partial<AppSettings[K]>,
  ) => void;
  resetSection: (section: keyof AppSettings) => void;
  resetAll: () => void;
  saveSettings: () => void;
};

const MockSettingsContext = createContext<MockSettingsContextValue | null>(null);

export function MockSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadAppSettings);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("file");

  const updateSettings = useCallback(
    <K extends keyof AppSettings>(section: K, patch: Partial<AppSettings[K]>) => {
      setSettings((prev) => ({
        ...prev,
        [section]: { ...prev[section], ...patch },
      }));
    },
    [],
  );

  const resetSection = useCallback((section: keyof AppSettings) => {
    setSettings((prev) => ({
      ...prev,
      [section]: DEFAULT_APP_SETTINGS[section],
    }));
  }, []);

  const resetAll = useCallback(() => {
    setSettings(DEFAULT_APP_SETTINGS);
  }, []);

  const saveSettings = useCallback(() => {
    saveAppSettings(settings);
  }, [settings]);

  const value = useMemo(
    () => ({
      settings,
      activeSection,
      setActiveSection,
      updateSettings,
      resetSection,
      resetAll,
      saveSettings,
    }),
    [settings, activeSection, updateSettings, resetSection, resetAll, saveSettings],
  );

  return (
    <MockSettingsContext.Provider value={value}>
      {children}
    </MockSettingsContext.Provider>
  );
}

export function useMockSettings(): MockSettingsContextValue {
  const ctx = useContext(MockSettingsContext);
  if (!ctx) {
    throw new Error("useMockSettings must be used within MockSettingsProvider");
  }
  return ctx;
}
