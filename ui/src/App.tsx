import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GanttChartView, TaskSheetView } from "./components/GanttChartView";
import {
  CalendarView,
  NetworkDiagramView,
} from "./components/mock/CalendarView";
import { KnowledgeView } from "./components/mock/KnowledgeView";
import { ProjectFilesView } from "./components/mock/ProjectFilesView";
import { ProjectCenterView } from "./components/mock/ProjectCenterView";
import { ProjectInfoView } from "./components/mock/ProjectInfoView";
import { WorkingTimeView } from "./components/mock/WorkingTimeView";
import { AppSettingsView } from "./components/mock/AppSettingsView";
import { MockProjectProvider } from "./context/MockProjectContext";
import { MockKnowledgeProvider } from "./context/MockKnowledgeContext";
import { MockFilesProvider } from "./context/MockFilesContext";
import { MockSettingsProvider } from "./context/MockSettingsContext";
import { GanttLayoutProvider } from "./context/GanttLayoutContext";
import {
  ProjectViewProvider,
  pathToView,
  viewToPath,
  WORKSPACE_OVERLAY_VIEWS,
  type ProjectView,
} from "./context/ProjectViewContext";
import { StatusBarProvider, useStatusBar } from "./context/StatusBarContext";
import { ToastProvider, useToast } from "./context/ToastContext";
import {
  applyThemeRootBlock,
  fetchAppMetadata,
  fetchThemeCss,
} from "./lib/nest";

let bootstrapPromise: Promise<void> | null = null;

function runAppBootstrap(
  setStatus: ReturnType<typeof useStatusBar>["setStatus"],
  toastInfo: ReturnType<typeof useToast>["info"],
  toastWarning: ReturnType<typeof useToast>["warning"],
): Promise<void> {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    setStatus("Loading mockup…");
    try {
      const theme = await fetchThemeCss();
      applyThemeRootBlock(theme.root_block);
      await fetchAppMetadata();
      setStatus("UI mockup — data not connected yet", { variant: "info" });
      toastInfo("Connected to Tauri host");
    } catch {
      setStatus("UI mockup (browser preview)", { variant: "warning" });
      toastWarning("Running in browser preview — Tauri APIs unavailable");
    }
  })();

  return bootstrapPromise;
}

export function App() {
  return (
    <ErrorBoundary label="app">
      <StatusBarProvider>
        <ToastProvider>
          <GanttLayoutProvider>
          <MockProjectProvider>
            <MockKnowledgeProvider>
              <MockFilesProvider>
                <MockSettingsProvider>
                  <AppRoutes />
                </MockSettingsProvider>
              </MockFilesProvider>
            </MockKnowledgeProvider>
          </MockProjectProvider>
          </GanttLayoutProvider>
        </ToastProvider>
      </StatusBarProvider>
    </ErrorBoundary>
  );
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const view = pathToView(location.pathname);
  const [returnView, setReturnView] = useState<ProjectView>("gantt");

  const setView = (next: ProjectView) => {
    if (
      WORKSPACE_OVERLAY_VIEWS.includes(next) &&
      !WORKSPACE_OVERLAY_VIEWS.includes(view)
    ) {
      setReturnView(view);
    }
    navigate(viewToPath(next));
  };

  const closeToWorkspace = () => {
    navigate(viewToPath(returnView));
  };

  return (
    <ProjectViewProvider
      view={view}
      returnView={returnView}
      onViewChange={setView}
      onCloseToWorkspace={closeToWorkspace}
    >
      <AppRoutesInner />
    </ProjectViewProvider>
  );
}

function AppRoutesInner() {
  const { setStatus } = useStatusBar();
  const { info: toastInfo, warning: toastWarning } = useToast();
  const [agentOpen, setAgentOpen] = useState(false);

  useEffect(() => {
    void runAppBootstrap(setStatus, toastInfo, toastWarning);
  }, [setStatus, toastInfo, toastWarning]);

  useEffect(() => {
    const stored = localStorage.getItem("swift.agentRailOpen");
    if (stored === "true") {
      setAgentOpen(true);
    }
  }, []);

  const toggleAgent = () => {
    setAgentOpen((open) => {
      const next = !open;
      localStorage.setItem("swift.agentRailOpen", String(next));
      return next;
    });
  };

  const location = useLocation();

  return (
    <AppShell agentOpen={agentOpen} onToggleAgent={toggleAgent}>
      <ErrorBoundary key={location.pathname} label="view">
        <Routes>
          <Route path="/" element={<Navigate to="/gantt" replace />} />
          <Route path="/gantt" element={<GanttChartView />} />
          <Route path="/task-sheet" element={<TaskSheetView />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/network" element={<NetworkDiagramView />} />
          <Route path="/knowledge" element={<KnowledgeView />} />
          <Route path="/files" element={<ProjectFilesView />} />
          <Route path="/projects" element={<ProjectCenterView />} />
          <Route path="/settings" element={<ProjectInfoView />} />
          <Route path="/app-settings" element={<AppSettingsView />} />
          <Route path="/working-time" element={<WorkingTimeView />} />
          <Route path="*" element={<Navigate to="/gantt" replace />} />
        </Routes>
      </ErrorBoundary>
    </AppShell>
  );
}
