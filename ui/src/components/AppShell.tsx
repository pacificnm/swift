import type { ReactNode } from "react";
import { ProjectRibbon } from "./ProjectRibbon";
import { StatusBar } from "./StatusBar";
import { AgentPanelMock } from "./mock/AgentPanelMock";
import { NewProjectForm } from "./mock/NewProjectForm";
import { NewTaskForm } from "./mock/NewTaskForm";
import { NewKnowledgeArticleForm } from "./mock/NewKnowledgeArticleForm";
import { NewKnowledgeCategoryForm } from "./mock/NewKnowledgeCategoryForm";
import { ToastViewport } from "./ToastViewport";
import { useProjectView } from "../context/ProjectViewContext";
import { useMockProject } from "../context/MockProjectContext";

type AppShellProps = {
  agentOpen: boolean;
  onToggleAgent: () => void;
  children: ReactNode;
};

export function AppShell({ agentOpen, onToggleAgent, children }: AppShellProps) {
  const { viewLabel } = useProjectView();
  const { project, tasks } = useMockProject();
  const newTasks = tasks.filter((t) => !t.isSummary && t.percentComplete === 0).length;

  return (
    <div className="flex h-screen min-h-0 flex-col bg-nest-background text-nest-foreground">
      <ProjectRibbon
        projectName={project.name}
        agentOpen={agentOpen}
        onToggleAgent={onToggleAgent}
      />

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>

        {agentOpen ? (
          <aside
            id="agent-rail"
            className="flex w-80 shrink-0 flex-col border-l border-nest-border bg-nest-surface"
          >
            <div className="flex items-center justify-between border-b border-nest-border px-4 py-3 text-sm font-medium">
              <span>AI assistant</span>
              <span className="rounded-nest-sm bg-nest-warning/15 px-1.5 py-0.5 text-[10px] font-normal text-nest-warning">
                Mock
              </span>
            </div>
            <AgentPanelMock />
          </aside>
        ) : null}
      </div>

      <StatusBar viewLabel={viewLabel} zoom={100} newTasks={newTasks} />
      <NewProjectForm />
      <NewTaskForm />
      <NewKnowledgeArticleForm />
      <NewKnowledgeCategoryForm />
      <ToastViewport />
    </div>
  );
}
