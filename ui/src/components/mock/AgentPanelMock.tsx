import { faPaperPlane, faRobot } from "../../lib/fontawesome";
import { Icon } from "../Icon";
import { useMockSettings } from "../../context/MockSettingsContext";

const MOCK_MESSAGES = [
  {
    role: "user" as const,
    text: "What’s left for swift-data phase 1?",
  },
  {
    role: "assistant" as const,
    text: "From your project knowledge: migrations for projects, tasks, task_links, knowledge_items with pgvector, plus ProjectRepository and TaskRepository. nest-data-postgres is already on main.",
  },
];

export function AgentPanelMock() {
  const { settings } = useMockSettings();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-nest-border px-3 py-1.5 text-[10px] text-nest-muted">
        Model: <span className="font-mono text-nest-foreground">{settings.agent.chatModel}</span>
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-3">
        {MOCK_MESSAGES.map((msg, i) => (
          <div
            key={i}
            className={[
              "rounded-nest-md px-3 py-2 text-xs leading-relaxed",
              msg.role === "user"
                ? "ml-4 bg-nest-primary/15 text-nest-foreground"
                : "mr-2 bg-nest-muted/10 text-nest-foreground",
            ].join(" ")}
          >
            {msg.text}
          </div>
        ))}
        <p className="flex items-center gap-1 text-[10px] text-nest-muted">
          <Icon icon={faRobot} className="size-3" />
          Mock chat — Ollama + swift_search_knowledge in phase 4
        </p>
      </div>
      <div className="border-t border-nest-border p-2">
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            placeholder="Ask about this project…"
            className="min-w-0 flex-1 rounded-nest-md border border-nest-border bg-nest-background px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled
            className="rounded-nest-md bg-nest-primary/20 p-2 text-nest-primary"
            aria-label="Send"
          >
            <Icon icon={faPaperPlane} className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
