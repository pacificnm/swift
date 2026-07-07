/** Static app metadata — version should match package.json / tauri.conf.json. */
export const APP_INFO = {
  name: "Swift",
  version: "0.1.0",
  identifier: "com.nest.swift",
  tagline: "Personal project management and knowledge hub",
  description:
    "Microsoft Project–style scheduling and portfolio workspace for solo builders. " +
    "Per-project Gantt charts, knowledge ingest, and an Ollama agent with vector search.",
  stack: "Tauri 2 · React 19 · Tailwind · Nest desktop template",
  phase: "UI mockup (phase 0)",
  copyright: "Nest Framework",
} as const;
