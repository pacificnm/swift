export type SettingsSectionId =
  | "file"
  | "task"
  | "view"
  | "project"
  | "knowledge"
  | "database"
  | "agent";

export const SETTINGS_SECTIONS: { id: SettingsSectionId; label: string }[] = [
  { id: "file", label: "File" },
  { id: "task", label: "Task" },
  { id: "view", label: "View" },
  { id: "project", label: "Project" },
  { id: "knowledge", label: "Knowledge" },
  { id: "database", label: "Database" },
  { id: "agent", label: "Agent & AI" },
];

export const DEFAULT_TASK_PRIORITIES = ["Low", "Normal", "High"] as const;

export const DEFAULT_TASK_CONSTRAINT_TYPES = [
  "As Soon As Possible",
  "As Late As Possible",
  "Must Start On",
  "Must Finish On",
  "Start No Earlier Than",
  "Start No Later Than",
  "Finish No Earlier Than",
  "Finish No Later Than",
] as const;

export const DEFAULT_TASK_TYPES = [
  "Fixed Duration",
  "Fixed Units",
  "Fixed Work",
] as const;

/** Ollama chat models supported in Swift agent settings (up to 30B). */
export const MAX_AGENT_CHAT_MODEL_SIZE_B = 30;

export type AgentChatModelOption = {
  value: string;
  label: string;
  sizeB: number;
};

export const AGENT_CHAT_MODEL_OPTIONS: AgentChatModelOption[] = [
  { value: "qwen2.5-coder:3b", label: "Qwen 2.5 Coder", sizeB: 3 },
  { value: "llama3.2:3b", label: "Llama 3.2", sizeB: 3 },
  { value: "phi3:mini", label: "Phi-3 Mini", sizeB: 4 },
  { value: "mistral", label: "Mistral", sizeB: 7 },
  { value: "qwen2.5:7b", label: "Qwen 2.5", sizeB: 7 },
  { value: "qwen2.5-coder:7b", label: "Qwen 2.5 Coder", sizeB: 7 },
  { value: "deepseek-r1:7b", label: "DeepSeek R1", sizeB: 7 },
  { value: "llama3.1:8b", label: "Llama 3.1", sizeB: 8 },
  { value: "qwen2.5:14b", label: "Qwen 2.5", sizeB: 14 },
  { value: "qwen2.5-coder:14b", label: "Qwen 2.5 Coder", sizeB: 14 },
  { value: "deepseek-r1:14b", label: "DeepSeek R1", sizeB: 14 },
  { value: "codellama:13b", label: "Code Llama", sizeB: 13 },
  { value: "gemma2:27b", label: "Gemma 2", sizeB: 27 },
  { value: "qwen3:30b", label: "Qwen 3", sizeB: 30 },
];

export function agentChatModelSelectOptions(
  currentModel?: string,
): { value: string; label: string }[] {
  const options = AGENT_CHAT_MODEL_OPTIONS.filter(
    (model) => model.sizeB <= MAX_AGENT_CHAT_MODEL_SIZE_B,
  ).map((model) => ({
    value: model.value,
    label: `${model.label} (${model.sizeB}B) — ${model.value}`,
  }));

  const trimmed = currentModel?.trim();
  if (trimmed && !options.some((option) => option.value === trimmed)) {
    options.push({ value: trimmed, label: `${trimmed} (custom)` });
  }

  return options;
}

export type AppSettings = {
  file: {
    defaultSaveLocation: "documents" | "app-data" | "custom";
    autoSaveInterval: "off" | "1" | "5" | "15";
    recentProjectsLimit: "5" | "10" | "20";
    defaultExportFormat: "swift" | "mspx" | "csv";
  };
  task: {
    newTaskType: "fixed-duration" | "fixed-units" | "fixed-work";
    durationUnit: "days" | "hours" | "weeks";
    statusDateRule: "today" | "project-start" | "custom";
    respectLinksOnEdit: "ask" | "always" | "never";
    /** Task form → Advanced tab → Priority dropdown */
    priorities: string[];
    /** Task form → Advanced tab → Constraint type dropdown */
    constraintTypes: string[];
    /** Task form → Advanced tab → Task type dropdown */
    taskTypes: string[];
  };
  view: {
    startupView: "gantt" | "task-sheet" | "knowledge" | "projects";
    timelineDefault: "remember" | "show" | "hide";
    dateFormat: "short" | "long" | "iso";
    agentPanelDefault: "remember" | "open" | "closed";
  };
  project: {
    defaultCalendar: "standard" | "24h" | "night";
    weekStartsOn: "sunday" | "monday";
    currency: "USD" | "EUR" | "GBP";
    effortDrivenDefault: "yes" | "no";
  };
  knowledge: {
    defaultSourceType: "manual" | "doc" | "email" | "slack" | "url";
    autoIndexOnSave: "always" | "ask" | "never";
    searchMode: "vector" | "keyword" | "hybrid";
    embeddingProvider: "ollama" | "openai";
    embeddingModel: "nomic-embed-text" | "text-embedding-3-small";
  };
  database: {
    url: string;
    sslMode: "disable" | "prefer" | "require";
    poolSize: "5" | "10" | "20";
    vectorDimensions: "768" | "1536";
  };
  agent: {
    ollamaBaseUrl: string;
    /** Ollama model tag — maps to [ollama].default_model */
    chatModel: string;
    maxSteps: "4" | "8" | "16";
    toolTimeoutSecs: "30" | "60" | "120";
    allowWrites: "false" | "true";
    mcpEnabled: "false" | "true";
  };
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  file: {
    defaultSaveLocation: "app-data",
    autoSaveInterval: "5",
    recentProjectsLimit: "10",
    defaultExportFormat: "swift",
  },
  task: {
    newTaskType: "fixed-duration",
    durationUnit: "days",
    statusDateRule: "today",
    respectLinksOnEdit: "ask",
    priorities: [...DEFAULT_TASK_PRIORITIES],
    constraintTypes: [...DEFAULT_TASK_CONSTRAINT_TYPES],
    taskTypes: [...DEFAULT_TASK_TYPES],
  },
  view: {
    startupView: "gantt",
    timelineDefault: "remember",
    dateFormat: "short",
    agentPanelDefault: "remember",
  },
  project: {
    defaultCalendar: "standard",
    weekStartsOn: "monday",
    currency: "USD",
    effortDrivenDefault: "no",
  },
  knowledge: {
    defaultSourceType: "manual",
    autoIndexOnSave: "always",
    searchMode: "hybrid",
    embeddingProvider: "ollama",
    embeddingModel: "nomic-embed-text",
  },
  database: {
    url: "postgresql://swift:CHANGE_ME@server.lan:5432/swift",
    sslMode: "prefer",
    poolSize: "10",
    vectorDimensions: "768",
  },
  agent: {
    ollamaBaseUrl: "http://server.lan:11434",
    chatModel: "qwen2.5-coder:3b",
    maxSteps: "8",
    toolTimeoutSecs: "60",
    allowWrites: "false",
    mcpEnabled: "false",
  },
};

const STORAGE_KEY = "swift.appSettings";

function mergeStringList(
  saved: string[] | undefined,
  defaults: readonly string[],
): string[] {
  if (!saved || saved.length === 0) {
    return [...defaults];
  }
  return saved.map((item) => item.trim()).filter(Boolean);
}

/** Include a task's current value when it is not in the configured list. */
export function taskFieldOptions(
  options: readonly string[],
  current?: string,
): string[] {
  const trimmed = current?.trim();
  if (!trimmed || options.includes(trimmed)) {
    return [...options];
  }
  return [...options, trimmed];
}

export function loadAppSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_APP_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_APP_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const task = { ...DEFAULT_APP_SETTINGS.task, ...parsed.task };
    return {
      file: { ...DEFAULT_APP_SETTINGS.file, ...parsed.file },
      task: {
        ...DEFAULT_APP_SETTINGS.task,
        ...task,
        priorities: mergeStringList(task.priorities, DEFAULT_TASK_PRIORITIES),
        constraintTypes: mergeStringList(task.constraintTypes, DEFAULT_TASK_CONSTRAINT_TYPES),
        taskTypes: mergeStringList(task.taskTypes, DEFAULT_TASK_TYPES),
      },
      view: { ...DEFAULT_APP_SETTINGS.view, ...parsed.view },
      project: { ...DEFAULT_APP_SETTINGS.project, ...parsed.project },
      knowledge: { ...DEFAULT_APP_SETTINGS.knowledge, ...parsed.knowledge },
      database: { ...DEFAULT_APP_SETTINGS.database, ...parsed.database },
      agent: {
        ...DEFAULT_APP_SETTINGS.agent,
        ...parsed.agent,
        chatModel:
          parsed.agent?.chatModel?.trim() || DEFAULT_APP_SETTINGS.agent.chatModel,
      },
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
