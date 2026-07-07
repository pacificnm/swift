import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { hasSwiftData, listSettings, setDebugLogging, setSetting } from "../lib/swift";
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

  // Load settings sections from PostgreSQL (`app_settings`) in the desktop
  // shell, merging each `value_json` over the defaults. Browser dev uses
  // localStorage only.
  useEffect(() => {
    if (!hasSwiftData()) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await listSettings();
        if (cancelled || rows.length === 0) {
          return;
        }
        setSettings((prev) => {
          const merged = { ...prev };
          const record = merged as Record<string, Record<string, unknown>>;
          for (const row of rows) {
            if (
              row.key in merged &&
              row.value_json &&
              typeof row.value_json === "object"
            ) {
              record[row.key] = {
                ...record[row.key],
                ...(row.value_json as Record<string, unknown>),
              };
            }
          }
          return merged;
        });
      } catch (error) {
        console.error("Swift: failed to load settings from database", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the backend IPC command-logging flag in sync with the Advanced
  // setting. Runs on mount (after the DB load merges) and whenever toggled,
  // so the log file reflects the current preference without a Save/restart.
  const commandLogging = settings.advanced.commandLogging;
  useEffect(() => {
    if (!hasSwiftData()) {
      return;
    }
    setDebugLogging(commandLogging === "on").catch((error) =>
      console.error("Swift: failed to set IPC command logging", error),
    );
  }, [commandLogging]);

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
    if (hasSwiftData()) {
      (Object.keys(settings) as (keyof AppSettings)[]).forEach((section) => {
        setSetting(section, settings[section]).catch((error) =>
          console.error(`Swift: save settings [${section}] failed`, error),
        );
      });
    }
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
