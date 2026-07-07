import { useEffect, useState, type ReactNode } from "react";
import { faFolderOpen, faXmark } from "../../lib/fontawesome";
import { Icon } from "../Icon";
import { hasSwiftData, pickFolder, setSetting } from "../../lib/swift";
import { useMockSettings } from "../../context/MockSettingsContext";
import { useProjectView, PROJECT_VIEW_LABELS } from "../../context/ProjectViewContext";
import { useStatusBar } from "../../context/StatusBarContext";
import { useToast } from "../../context/ToastContext";
import {
  AGENT_CHAT_MODEL_OPTIONS,
  agentChatModelSelectOptions,
  DEFAULT_TASK_CONSTRAINT_TYPES,
  DEFAULT_TASK_PRIORITIES,
  DEFAULT_TASK_TYPES,
  SETTINGS_SECTIONS,
  type AppSettings,
  type SettingsSectionId,
} from "../../mock/settingsDemo";

export function AppSettingsView() {
  const { returnView, closeToWorkspace } = useProjectView();
  const { setStatus } = useStatusBar();
  const toast = useToast();
  const {
    settings,
    activeSection,
    setActiveSection,
    updateSettings,
    resetSection,
    saveSettings,
  } = useMockSettings();

  const handleOk = () => {
    saveSettings();
    setStatus("Swift settings saved (mock)", { variant: "success" });
    toast.success(`Settings saved — returning to ${PROJECT_VIEW_LABELS[returnView]}`);
    closeToWorkspace();
  };

  const handleCancel = () => {
    setStatus(`Returned to ${PROJECT_VIEW_LABELS[returnView]}`, { variant: "info" });
    closeToWorkspace();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="flex h-full min-h-0 bg-nest-background">
      <aside className="flex w-52 shrink-0 flex-col border-r border-nest-border bg-nest-surface">
        <p className="border-b border-nest-border px-4 py-3 text-xs font-medium uppercase tracking-wide text-nest-muted">
          Settings
        </p>
        <nav className="min-h-0 flex-1 overflow-auto p-2">
          {SETTINGS_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={[
                "mb-0.5 flex w-full rounded-nest-sm px-3 py-2 text-left text-sm",
                activeSection === section.id
                  ? "bg-nest-primary/15 font-medium text-nest-primary"
                  : "text-nest-foreground hover:bg-nest-muted/10",
              ].join(" ")}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-nest-border bg-nest-surface px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Swift Settings</h1>
            <p className="mt-1 text-sm text-nest-muted">
              Application preferences — maps to <code className="text-xs">config.toml</code> in
              production.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-nest-sm p-1.5 text-nest-muted hover:bg-nest-muted/10 hover:text-nest-foreground"
            aria-label="Close"
          >
            <Icon icon={faXmark} className="size-4" />
          </button>
        </header>

        <form
          className="min-h-0 flex-1 overflow-auto px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            handleOk();
          }}
        >
          <SectionPanel section={activeSection} settings={settings} onChange={updateSettings} />

          <div className="mt-8 flex items-center justify-between border-t border-nest-border pt-4">
            <button
              type="button"
              onClick={() => resetSection(activeSection)}
              className="text-sm text-nest-muted hover:text-nest-foreground"
            >
              Reset {SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.label} defaults
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-nest-md border border-nest-border px-4 py-2 text-sm hover:bg-nest-muted/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-nest-md bg-nest-primary px-5 py-2 text-sm font-medium text-white hover:bg-nest-secondary"
              >
                OK
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionPanel({
  section,
  settings,
  onChange,
}: {
  section: SettingsSectionId;
  settings: AppSettings;
  onChange: <K extends keyof AppSettings>(
    section: K,
    patch: Partial<AppSettings[K]>,
  ) => void;
}) {
  switch (section) {
    case "file":
      return (
        <SettingsGroup title="File" description="Save locations, auto-save, and export defaults.">
          <SelectField
            label="Default save location"
            value={settings.file.defaultSaveLocation}
            onChange={(value) =>
              onChange("file", {
                defaultSaveLocation: value as AppSettings["file"]["defaultSaveLocation"],
              })
            }
            options={[
              { value: "documents", label: "Documents / Swift Projects" },
              { value: "app-data", label: "Application data folder" },
              { value: "custom", label: "Custom path…" },
            ]}
          />
          <SelectField
            label="Auto-save interval"
            value={settings.file.autoSaveInterval}
            onChange={(value) =>
              onChange("file", {
                autoSaveInterval: value as AppSettings["file"]["autoSaveInterval"],
              })
            }
            options={[
              { value: "off", label: "Off" },
              { value: "1", label: "Every 1 minute" },
              { value: "5", label: "Every 5 minutes" },
              { value: "15", label: "Every 15 minutes" },
            ]}
          />
          <SelectField
            label="Recent projects list"
            value={settings.file.recentProjectsLimit}
            onChange={(value) =>
              onChange("file", {
                recentProjectsLimit: value as AppSettings["file"]["recentProjectsLimit"],
              })
            }
            options={[
              { value: "5", label: "5 projects" },
              { value: "10", label: "10 projects" },
              { value: "20", label: "20 projects" },
            ]}
          />
          <SelectField
            label="Default export format"
            value={settings.file.defaultExportFormat}
            onChange={(value) =>
              onChange("file", {
                defaultExportFormat: value as AppSettings["file"]["defaultExportFormat"],
              })
            }
            options={[
              { value: "swift", label: "Swift project (.swift)" },
              { value: "mspx", label: "Microsoft Project XML" },
              { value: "csv", label: "CSV task export" },
            ]}
          />
          <FolderField
            label="Project files location"
            file={settings.file}
            hint="Root folder for attachments. Each project gets its own subfolder."
            onChange={(projectFilesRoot) => onChange("file", { projectFilesRoot })}
          />
        </SettingsGroup>
      );

    case "task":
      return (
        <>
          <SettingsGroup title="Task" description="Defaults for the Task ribbon and scheduling.">
            <SelectField
              label="New task type"
              value={settings.task.newTaskType}
              onChange={(value) =>
                onChange("task", { newTaskType: value as AppSettings["task"]["newTaskType"] })
              }
              options={[
                { value: "fixed-duration", label: "Fixed Duration" },
                { value: "fixed-units", label: "Fixed Units" },
                { value: "fixed-work", label: "Fixed Work" },
              ]}
            />
            <SelectField
              label="Duration unit"
              value={settings.task.durationUnit}
              onChange={(value) =>
                onChange("task", { durationUnit: value as AppSettings["task"]["durationUnit"] })
              }
              options={[
                { value: "days", label: "Days" },
                { value: "hours", label: "Hours" },
                { value: "weeks", label: "Weeks" },
              ]}
            />
            <SelectField
              label="Status date"
              value={settings.task.statusDateRule}
              onChange={(value) =>
                onChange("task", {
                  statusDateRule: value as AppSettings["task"]["statusDateRule"],
                })
              }
              options={[
                { value: "today", label: "Today's date" },
                { value: "project-start", label: "Project start date" },
                { value: "custom", label: "Custom date…" },
              ]}
            />
            <SelectField
              label="Respect links when editing dates"
              value={settings.task.respectLinksOnEdit}
              onChange={(value) =>
                onChange("task", {
                  respectLinksOnEdit: value as AppSettings["task"]["respectLinksOnEdit"],
                })
              }
              options={[
                { value: "ask", label: "Ask each time" },
                { value: "always", label: "Always respect links" },
                { value: "never", label: "Never (manual schedule)" },
              ]}
            />
          </SettingsGroup>

          <SettingsGroup
            title="Task form — Advanced dropdowns"
            description="Options shown on the Task Form Advanced tab (Priority, Constraint type, Task type)."
            className="mt-6"
          >
            <OptionListEditor
              label="Priority levels"
              options={settings.task.priorities}
              placeholder="e.g. Critical"
              onChange={(priorities) => onChange("task", { priorities })}
            />
            <OptionListEditor
              label="Constraint types"
              options={settings.task.constraintTypes}
              placeholder="e.g. Must Start On"
              onChange={(constraintTypes) => onChange("task", { constraintTypes })}
            />
            <OptionListEditor
              label="Task types"
              options={settings.task.taskTypes}
              placeholder="e.g. Fixed Duration"
              onChange={(taskTypes) => onChange("task", { taskTypes })}
            />
            <button
              type="button"
              onClick={() =>
                onChange("task", {
                  priorities: [...DEFAULT_TASK_PRIORITIES],
                  constraintTypes: [...DEFAULT_TASK_CONSTRAINT_TYPES],
                  taskTypes: [...DEFAULT_TASK_TYPES],
                })
              }
              className="text-sm text-nest-muted hover:text-nest-foreground"
            >
              Restore Microsoft Project defaults
            </button>
          </SettingsGroup>
        </>
      );

    case "view":
      return (
        <SettingsGroup title="View" description="Startup view and Gantt display preferences.">
          <SelectField
            label="Open project to view"
            value={settings.view.startupView}
            onChange={(value) =>
              onChange("view", { startupView: value as AppSettings["view"]["startupView"] })
            }
            options={[
              { value: "gantt", label: "Gantt Chart" },
              { value: "task-sheet", label: "Task Sheet" },
              { value: "knowledge", label: "Knowledge Base" },
              { value: "projects", label: "Project Center" },
            ]}
          />
          <SelectField
            label="Timeline strip (Gantt)"
            value={settings.view.timelineDefault}
            onChange={(value) =>
              onChange("view", {
                timelineDefault: value as AppSettings["view"]["timelineDefault"],
              })
            }
            options={[
              { value: "remember", label: "Remember last setting" },
              { value: "show", label: "Always show" },
              { value: "hide", label: "Always hide" },
            ]}
          />
          <SelectField
            label="Date format"
            value={settings.view.dateFormat}
            onChange={(value) =>
              onChange("view", { dateFormat: value as AppSettings["view"]["dateFormat"] })
            }
            options={[
              { value: "short", label: "Mon 7/7/26" },
              { value: "long", label: "Monday, July 7, 2026" },
              { value: "iso", label: "2026-07-07 (ISO)" },
            ]}
          />
          <SelectField
            label="Agent panel"
            value={settings.view.agentPanelDefault}
            onChange={(value) =>
              onChange("view", {
                agentPanelDefault: value as AppSettings["view"]["agentPanelDefault"],
              })
            }
            options={[
              { value: "remember", label: "Remember last setting" },
              { value: "open", label: "Open by default" },
              { value: "closed", label: "Closed by default" },
            ]}
          />
        </SettingsGroup>
      );

    case "project":
      return (
        <SettingsGroup title="Project" description="Defaults for new projects and calendars.">
          <SelectField
            label="Default calendar"
            value={settings.project.defaultCalendar}
            onChange={(value) =>
              onChange("project", {
                defaultCalendar: value as AppSettings["project"]["defaultCalendar"],
              })
            }
            options={[
              { value: "standard", label: "Standard (Mon–Fri, 8h)" },
              { value: "24h", label: "24 Hours" },
              { value: "night", label: "Night Shift" },
            ]}
          />
          <SelectField
            label="Week starts on"
            value={settings.project.weekStartsOn}
            onChange={(value) =>
              onChange("project", {
                weekStartsOn: value as AppSettings["project"]["weekStartsOn"],
              })
            }
            options={[
              { value: "sunday", label: "Sunday" },
              { value: "monday", label: "Monday" },
            ]}
          />
          <SelectField
            label="Currency"
            value={settings.project.currency}
            onChange={(value) =>
              onChange("project", { currency: value as AppSettings["project"]["currency"] })
            }
            options={[
              { value: "USD", label: "US Dollar (USD)" },
              { value: "EUR", label: "Euro (EUR)" },
              { value: "GBP", label: "British Pound (GBP)" },
            ]}
          />
          <SelectField
            label="Effort driven by default"
            value={settings.project.effortDrivenDefault}
            onChange={(value) =>
              onChange("project", {
                effortDrivenDefault: value as AppSettings["project"]["effortDrivenDefault"],
              })
            }
            options={[
              { value: "no", label: "No" },
              { value: "yes", label: "Yes" },
            ]}
          />
        </SettingsGroup>
      );

    case "knowledge":
      return (
        <SettingsGroup
          title="Knowledge"
          description="Vector index and knowledge base defaults for company info."
        >
          <SelectField
            label="Default source type"
            value={settings.knowledge.defaultSourceType}
            onChange={(value) =>
              onChange("knowledge", {
                defaultSourceType: value as AppSettings["knowledge"]["defaultSourceType"],
              })
            }
            options={[
              { value: "manual", label: "Manual note" },
              { value: "doc", label: "Document" },
              { value: "email", label: "Email" },
              { value: "slack", label: "Slack" },
              { value: "url", label: "Web URL" },
            ]}
          />
          <SelectField
            label="Auto-index on save"
            value={settings.knowledge.autoIndexOnSave}
            onChange={(value) =>
              onChange("knowledge", {
                autoIndexOnSave: value as AppSettings["knowledge"]["autoIndexOnSave"],
              })
            }
            options={[
              { value: "always", label: "Always embed to pgvector" },
              { value: "ask", label: "Ask before indexing" },
              { value: "never", label: "Never (draft only)" },
            ]}
          />
          <SelectField
            label="Default search mode"
            value={settings.knowledge.searchMode}
            onChange={(value) =>
              onChange("knowledge", {
                searchMode: value as AppSettings["knowledge"]["searchMode"],
              })
            }
            options={[
              { value: "vector", label: "Vector (semantic)" },
              { value: "keyword", label: "Keyword (tsvector)" },
              { value: "hybrid", label: "Hybrid (vector + keyword)" },
            ]}
          />
          <SelectField
            label="Embedding provider"
            value={settings.knowledge.embeddingProvider}
            onChange={(value) =>
              onChange("knowledge", {
                embeddingProvider: value as AppSettings["knowledge"]["embeddingProvider"],
              })
            }
            options={[
              { value: "ollama", label: "Ollama (local/server)" },
              { value: "openai", label: "OpenAI API" },
            ]}
          />
          <SelectField
            label="Embedding model"
            value={settings.knowledge.embeddingModel}
            onChange={(value) =>
              onChange("knowledge", {
                embeddingModel: value as AppSettings["knowledge"]["embeddingModel"],
              })
            }
            options={[
              { value: "nomic-embed-text", label: "nomic-embed-text (768 dims)" },
              { value: "text-embedding-3-small", label: "text-embedding-3-small (1536 dims)" },
            ]}
          />
        </SettingsGroup>
      );

    case "database":
      return (
        <SettingsGroup
          title="Database"
          description="PostgreSQL connection for projects, tasks, and pgvector knowledge."
        >
          <TextField
            label="Connection URL"
            value={settings.database.url}
            onChange={(value) => onChange("database", { url: value })}
            mono
            hint="[database].url in config.toml"
          />
          <SelectField
            label="SSL mode"
            value={settings.database.sslMode}
            onChange={(value) =>
              onChange("database", { sslMode: value as AppSettings["database"]["sslMode"] })
            }
            options={[
              { value: "disable", label: "Disable" },
              { value: "prefer", label: "Prefer" },
              { value: "require", label: "Require" },
            ]}
          />
          <SelectField
            label="Connection pool size"
            value={settings.database.poolSize}
            onChange={(value) =>
              onChange("database", { poolSize: value as AppSettings["database"]["poolSize"] })
            }
            options={[
              { value: "5", label: "5 connections" },
              { value: "10", label: "10 connections" },
              { value: "20", label: "20 connections" },
            ]}
          />
          <SelectField
            label="Vector dimensions"
            value={settings.database.vectorDimensions}
            onChange={(value) =>
              onChange("database", {
                vectorDimensions: value as AppSettings["database"]["vectorDimensions"],
              })
            }
            options={[
              { value: "768", label: "768 (Ollama nomic-embed-text)" },
              { value: "1536", label: "1536 (OpenAI text-embedding-3-small)" },
            ]}
          />
        </SettingsGroup>
      );

    case "agent":
      return (
        <SettingsGroup title="Agent & AI" description="Ollama chat and agent tool settings.">
          <TextField
            label="Ollama base URL"
            value={settings.agent.ollamaBaseUrl}
            onChange={(value) => onChange("agent", { ollamaBaseUrl: value })}
            hint="[ollama].base_url"
          />
          <SelectField
            label="Agent chat model"
            value={settings.agent.chatModel}
            onChange={(value) => onChange("agent", { chatModel: value })}
            hint="Ollama tags up to 30B — maps to [ollama].default_model in config.toml"
            options={agentChatModelSelectOptions(settings.agent.chatModel)}
          />
          <TextField
            label="Custom Ollama model tag"
            value={
              AGENT_CHAT_MODEL_OPTIONS.some((m) => m.value === settings.agent.chatModel)
                ? ""
                : settings.agent.chatModel
            }
            onChange={(value) => {
              const trimmed = value.trim();
              if (trimmed) {
                onChange("agent", { chatModel: trimmed });
              }
            }}
            hint="Optional — use when your model is not in the list above (max ~30B recommended)"
          />
          <SelectField
            label="Max agent steps"
            value={settings.agent.maxSteps}
            onChange={(value) =>
              onChange("agent", { maxSteps: value as AppSettings["agent"]["maxSteps"] })
            }
            options={[
              { value: "4", label: "4 steps" },
              { value: "8", label: "8 steps" },
              { value: "16", label: "16 steps" },
            ]}
          />
          <SelectField
            label="Tool timeout"
            value={settings.agent.toolTimeoutSecs}
            onChange={(value) =>
              onChange("agent", {
                toolTimeoutSecs: value as AppSettings["agent"]["toolTimeoutSecs"],
              })
            }
            options={[
              { value: "30", label: "30 seconds" },
              { value: "60", label: "60 seconds" },
              { value: "120", label: "120 seconds" },
            ]}
          />
          <SelectField
            label="Allow agent writes"
            value={settings.agent.allowWrites}
            onChange={(value) =>
              onChange("agent", { allowWrites: value as AppSettings["agent"]["allowWrites"] })
            }
            options={[
              { value: "false", label: "No — read-only tools" },
              { value: "true", label: "Yes — allow task/note writes" },
            ]}
          />
          <SelectField
            label="MCP servers"
            value={settings.agent.mcpEnabled}
            onChange={(value) =>
              onChange("agent", { mcpEnabled: value as AppSettings["agent"]["mcpEnabled"] })
            }
            options={[
              { value: "false", label: "Disabled" },
              { value: "true", label: "Enabled (mcp.json)" },
            ]}
          />
        </SettingsGroup>
      );

    case "advanced":
      return (
        <SettingsGroup
          title="Advanced"
          description="Diagnostics and troubleshooting. Leave off for normal use."
        >
          <SelectField
            label="Log IPC commands"
            value={settings.advanced.commandLogging}
            onChange={(value) =>
              onChange("advanced", {
                commandLogging: value as AppSettings["advanced"]["commandLogging"],
              })
            }
            hint="Writes every command call + result to apps/swift/logs/swift. Applies immediately."
            options={[
              { value: "off", label: "Off" },
              { value: "on", label: "On — verbose command logging" },
            ]}
          />
        </SettingsGroup>
      );
  }
}

function SettingsGroup({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={["max-w-xl space-y-4", className].join(" ")}>
      <div>
        <h2 className="text-base font-semibold text-nest-foreground">{title}</h2>
        <p className="mt-1 text-sm text-nest-muted">{description}</p>
      </div>
      <div className="space-y-4 rounded-nest-lg border border-nest-border bg-nest-surface p-5">
        {children}
      </div>
    </section>
  );
}

function OptionListEditor({
  label,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  options: string[];
  placeholder: string;
  onChange: (options: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const updateAt = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  const addOption = () => {
    const trimmed = draft.trim();
    if (!trimmed || options.includes(trimmed)) {
      return;
    }
    onChange([...options, trimmed]);
    setDraft("");
  };

  return (
    <div className="space-y-2 border-b border-nest-border pb-4 last:border-b-0 last:pb-0">
      <p className="text-sm font-medium text-nest-foreground">{label}</p>
      <ul className="space-y-2">
        {options.map((option, index) => (
          <li key={`${label}-${index}`} className="flex gap-2">
            <input
              type="text"
              value={option}
              onChange={(event) => updateAt(index, event.target.value)}
              className="min-w-0 flex-1 rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => removeAt(index)}
              disabled={options.length <= 1}
              className="shrink-0 rounded-nest-md border border-nest-border px-3 py-2 text-sm text-nest-error hover:bg-nest-error/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addOption();
            }
          }}
          className="min-w-0 flex-1 rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addOption}
          className="shrink-0 rounded-nest-md bg-nest-primary px-3 py-2 text-sm font-medium text-white hover:bg-nest-secondary"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-nest-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className="mt-1 block text-xs text-nest-muted">{hint}</span> : null}
    </label>
  );
}

function FolderField({
  label,
  file,
  onChange,
  hint,
}: {
  label: string;
  file: AppSettings["file"];
  onChange: (value: string) => void;
  hint?: string;
}) {
  const value = file.projectFilesRoot;
  const handleBrowse = async () => {
    if (!hasSwiftData()) {
      return;
    }
    try {
      const picked = await pickFolder();
      if (!picked) {
        return;
      }
      onChange(picked);
      // Persist the whole section immediately so the backend can resolve the
      // root before the user hits OK (Add File reads
      // app_settings["file"].projectFilesRoot).
      await setSetting("file", { ...file, projectFilesRoot: picked });
    } catch (error) {
      console.error("Swift: choose files root failed", error);
    }
  };

  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-nest-foreground">{label}</span>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          placeholder="e.g. /home/you/Swift Files"
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 font-mono text-xs"
        />
        <button
          type="button"
          onClick={handleBrowse}
          disabled={!hasSwiftData()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-nest-md border border-nest-border px-3 py-2 text-sm hover:bg-nest-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
          title={hasSwiftData() ? "Browse for a folder" : "Available in the desktop app"}
        >
          <Icon icon={faFolderOpen} className="size-3.5" />
          Browse…
        </button>
      </div>
      {hint ? <span className="mt-1 block text-xs text-nest-muted">{hint}</span> : null}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  hint,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-nest-foreground">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm",
          mono ? "font-mono text-xs" : "",
        ].join(" ")}
      />
      {hint ? <span className="mt-1 block text-xs text-nest-muted">{hint}</span> : null}
    </label>
  );
}
