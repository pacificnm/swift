import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

export type ProjectView =
  | "gantt"
  | "task-sheet"
  | "calendar"
  | "network"
  | "knowledge"
  | "files"
  | "settings"
  | "app-settings"
  | "working-time"
  | "projects";

export const PROJECT_VIEW_LABELS: Record<ProjectView, string> = {
  gantt: "Gantt Chart",
  "task-sheet": "Task Sheet",
  calendar: "Calendar",
  network: "Network Diagram",
  knowledge: "Knowledge Base",
  files: "Project Files",
  settings: "Project Options",
  "app-settings": "Swift Settings",
  "working-time": "Change Working Time",
  projects: "Project Center",
};

export const WORKSPACE_OVERLAY_VIEWS: ProjectView[] = [
  "settings",
  "app-settings",
  "working-time",
  "projects",
];

type ProjectViewContextValue = {
  view: ProjectView;
  viewLabel: string;
  returnView: ProjectView;
  setView: (view: ProjectView) => void;
  closeToWorkspace: () => void;
};

const ProjectViewContext = createContext<ProjectViewContextValue | null>(null);

export function ProjectViewProvider({
  view,
  returnView,
  onViewChange,
  onCloseToWorkspace,
  children,
}: {
  view: ProjectView;
  returnView: ProjectView;
  onViewChange: (view: ProjectView) => void;
  onCloseToWorkspace: () => void;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      view,
      viewLabel: PROJECT_VIEW_LABELS[view],
      returnView,
      setView: onViewChange,
      closeToWorkspace: onCloseToWorkspace,
    }),
    [view, returnView, onViewChange, onCloseToWorkspace],
  );

  return (
    <ProjectViewContext.Provider value={value}>
      {children}
    </ProjectViewContext.Provider>
  );
}

export function useProjectView(): ProjectViewContextValue {
  const context = useContext(ProjectViewContext);
  if (!context) {
    throw new Error("useProjectView must be used within ProjectViewProvider");
  }
  return context;
}

export function viewToPath(view: ProjectView): string {
  switch (view) {
    case "gantt":
      return "/gantt";
    case "task-sheet":
      return "/task-sheet";
    case "calendar":
      return "/calendar";
    case "network":
      return "/network";
    case "knowledge":
      return "/knowledge";
    case "files":
      return "/files";
    case "settings":
      return "/settings";
    case "app-settings":
      return "/app-settings";
    case "working-time":
      return "/working-time";
    case "projects":
      return "/projects";
  }
}

export function pathToView(pathname: string): ProjectView {
  if (pathname.startsWith("/task-sheet")) return "task-sheet";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/network")) return "network";
  if (pathname.startsWith("/knowledge")) return "knowledge";
  if (pathname.startsWith("/files")) return "files";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/app-settings")) return "app-settings";
  if (pathname.startsWith("/working-time")) return "working-time";
  if (pathname.startsWith("/projects")) return "projects";
  return "gantt";
}
