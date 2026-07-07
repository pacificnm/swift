import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faAnglesLeft,
  faAnglesRight,
  faBell,
  faBook,
  faBuilding,
  faCalendar,
  faChartGantt,
  faCircleCheck,
  faCircleInfo,
  faClipboardList,
  faClock,
  faCompress,
  faDatabase,
  faDiagramProject,
  faExpand,
  faFileCirclePlus,
  faFileLines,
  faFloppyDisk,
  faFolderClosed,
  faFolderOpen,
  faGear,
  faIndent,
  faLink,
  faMagnifyingGlass,
  faNoteSticky,
  faOutdent,
  faRightFromBracket,
  faRobot,
  faRotateLeft,
  faRotateRight,
  faTable,
  faTimeline,
} from "../lib/fontawesome";
import { Icon } from "./Icon";
import { ConfirmDialog } from "./ConfirmDialog";
import { AboutSwiftDialog } from "./AboutSwiftDialog";
import {
  Ribbon,
  RibbonButton,
  RibbonButtonStack,
  RibbonGroup,
  RibbonMenuButton,
  type RibbonTab,
} from "./Ribbon";
import { useMockProject } from "../context/MockProjectContext";
import { useMockKnowledge } from "../context/MockKnowledgeContext";
import { useGanttLayout } from "../context/GanttLayoutContext";
import { useProjectView, viewToPath, PROJECT_VIEW_LABELS, type ProjectView } from "../context/ProjectViewContext";
import { useStatusBar } from "../context/StatusBarContext";
import { useToast } from "../context/ToastContext";
import { canIndentTask, canOutdentTask, formatProjectDate, findSuccessorTasks, parsePredecessorIds, taskHasScheduleLinks, todayIsoDate } from "../mock/demo";
import { quitApp } from "../lib/tauri";

type ProjectRibbonProps = {
  projectName: string;
  agentOpen: boolean;
  onToggleAgent: () => void;
};

export function ProjectRibbon({
  projectName,
  agentOpen,
  onToggleAgent,
}: ProjectRibbonProps) {
  const [activeTab, setActiveTab] = useState<RibbonTab>("task");
  const [markOnTrackOpen, setMarkOnTrackOpen] = useState(false);
  const [respectLinksOpen, setRespectLinksOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const navigate = useNavigate();
  const { setStatus } = useStatusBar();
  const toast = useToast();
  const { view, setView } = useProjectView();
  const {
    tasks,
    selectedTask,
    markTaskOnTrack,
    respectTaskLinks,
    indentTask,
    outdentTask,
    setShowTaskDetails,
    openNewProject,
    openNewTask,
  } = useMockProject();
  const {
    selectedArticle,
    openNewArticle,
    openNewCategory,
    reindexArticle,
    requestSearchFocus,
  } = useMockKnowledge();
  const { gridHidden, expandChart, restoreChart, showTimeline, toggleTimeline } = useGanttLayout();

  const statusDateLabel = formatProjectDate(todayIsoDate());
  const canMarkOnTrack =
    selectedTask !== null &&
    !selectedTask.isSummary &&
    selectedTask.percentComplete < 100;

  const canRespectLinks =
    selectedTask !== null &&
    !selectedTask.isSummary &&
    taskHasScheduleLinks(tasks, selectedTask.id);

  const canIndent =
    selectedTask !== null && canIndentTask(tasks, selectedTask.id);

  const canOutdent =
    selectedTask !== null && canOutdentTask(tasks, selectedTask.id);

  const successorCount = selectedTask
    ? findSuccessorTasks(tasks, selectedTask.id).length
    : 0;
  const predecessorCount = selectedTask
    ? parsePredecessorIds(selectedTask.predecessors).length
    : 0;

  const confirmMarkOnTrack = () => {
    if (!selectedTask) {
      return;
    }
    const result = markTaskOnTrack(selectedTask.id);
    setMarkOnTrackOpen(false);
    if (!result.ok) {
      toast.error(result.message);
      setStatus(result.message, { variant: "error" });
      return;
    }
    toast.success(result.message);
    setStatus(result.message, { variant: "success" });
  };

  const confirmRespectLinks = () => {
    if (!selectedTask) {
      return;
    }
    const result = respectTaskLinks(selectedTask.id);
    setRespectLinksOpen(false);
    if (!result.ok) {
      toast.error(result.message);
      setStatus(result.message, { variant: "error" });
      return;
    }
    if (result.movedCount === 0) {
      toast.info(result.message);
    } else {
      toast.success(result.message);
    }
    setStatus(result.message, {
      variant: result.movedCount === 0 ? "info" : "success",
    });
  };

  const runOutlineChange = (
    action: (taskId: string) => { ok: boolean; message: string },
  ) => {
    if (!selectedTask) {
      return;
    }
    const result = action(selectedTask.id);
    if (!result.ok) {
      toast.error(result.message);
      setStatus(result.message, { variant: "error" });
      return;
    }
    toast.success(result.message);
    setStatus(result.message, { variant: "success" });
  };

  const goToView = (next: ProjectView) => {
    setView(next);
    navigate(viewToPath(next));
    setStatus(`View: ${next === "gantt" ? "Gantt Chart" : PROJECT_VIEW_LABELS[next]}`, {
      variant: "info",
    });
  };

  const goToKnowledge = () => {
    goToView("knowledge");
  };

  const runReindex = () => {
    if (!selectedArticle) {
      const message = "Open Knowledge Base and select an article to re-index.";
      toast.error(message);
      setStatus(message, { variant: "error" });
      return;
    }
    const result = reindexArticle(selectedArticle.id);
    if (!result.ok) {
      toast.error(result.message);
      setStatus(result.message, { variant: "error" });
      return;
    }
    toast.success(result.message);
    setStatus(result.message, { variant: "success" });
  };

  return (
    <div className="shrink-0 border-b border-nest-border bg-nest-surface shadow-sm">
      <div className="flex h-7 items-center justify-between gap-2 border-b border-nest-border bg-nest-primary px-2 text-white">
        <div className="flex items-center gap-0.5">
          <QuickButton label="Save" icon={faFloppyDisk} disabled onClick={() => undefined} />
          <QuickButton label="Undo" icon={faRotateLeft} disabled onClick={() => undefined} />
          <QuickButton label="Redo" icon={faRotateRight} disabled onClick={() => undefined} />
        </div>
        <p className="truncate text-[11px] font-semibold">
          {projectName}
          <span className="ml-2 rounded-nest-sm bg-white/15 px-1.5 py-0.5 text-[9px] font-normal">
            Mockup
          </span>
        </p>
        <button
          type="button"
          onClick={onToggleAgent}
          className={[
            "flex items-center gap-1 rounded-nest-sm px-1.5 py-0.5 text-[11px] transition-colors",
            agentOpen
              ? "bg-white/20 text-white"
              : "text-white/85 hover:bg-white/10 hover:text-white",
          ].join(" ")}
          aria-pressed={agentOpen}
          aria-controls="agent-rail"
        >
          {agentOpen ? (
            <Icon icon={faAnglesRight} className="size-3.5" />
          ) : (
            <Icon icon={faAnglesLeft} className="size-3.5" />
          )}
          Agent
        </button>
      </div>

      <Ribbon activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "file" ? (
          <div className="flex gap-1">
            <RibbonGroup label="Application">
              <RibbonButton
                label="Settings"
                icon={faGear}
                iconTint="neutral"
                large
                active={view === "app-settings"}
                onClick={() => goToView("app-settings")}
              />
            </RibbonGroup>
            <RibbonGroup label="Project">
              <RibbonButton
                label="New"
                icon={faFileCirclePlus}
                iconTint="secondary"
                large
                onClick={openNewProject}
              />
              <RibbonButton
                label="Open"
                icon={faFolderOpen}
                iconTint="secondary"
                large
                onClick={() => goToView("projects")}
              />
              <RibbonButton
                label="Save"
                icon={faFloppyDisk}
                iconTint="secondary"
                large
                disabled
              />
            </RibbonGroup>
            <RibbonGroup label="Exit">
              <RibbonButton
                label="Exit Swift"
                icon={faRightFromBracket}
                iconTint="warning"
                large
                onClick={() => void quitApp()}
              />
            </RibbonGroup>
          </div>
        ) : null}

        {activeTab === "task" ? (
          <div className="flex gap-1">
            <RibbonGroup label="Schedule">
              <RibbonButton
                label="Mark on Track"
                icon={faCircleCheck}
                iconTint="accent"
                disabled={!canMarkOnTrack}
                onClick={() => setMarkOnTrackOpen(true)}
              />
              <RibbonButton
                label="Respect Links"
                icon={faLink}
                iconTint="info"
                disabled={!canRespectLinks}
                onClick={() => setRespectLinksOpen(true)}
              />
            </RibbonGroup>
            <RibbonGroup label="Tasks">
              <RibbonButton
                label="New Task"
                icon={faClipboardList}
                iconTint="secondary"
                large
                onClick={openNewTask}
              />
              <RibbonButtonStack>
                <RibbonMenuButton
                  label="Indent"
                  icon={faIndent}
                  disabled={!canIndent}
                  onClick={() => runOutlineChange(indentTask)}
                />
                <RibbonMenuButton
                  label="Outdent"
                  icon={faOutdent}
                  disabled={!canOutdent}
                  onClick={() => runOutlineChange(outdentTask)}
                />
              </RibbonButtonStack>
            </RibbonGroup>
            <RibbonGroup label="Properties">
              <RibbonButton
                label="Information"
                icon={faCircleInfo}
                iconTint="info"
                onClick={() => {
                  setShowTaskDetails(true);
                  setStatus("Task Form — select a row to inspect fields", {
                    variant: "info",
                  });
                }}
              />
            </RibbonGroup>
          </div>
        ) : null}

        {activeTab === "view" ? (
          <div className="flex gap-1">
            <RibbonGroup label="Task Views">
              <RibbonButton
                label="Gantt Chart"
                icon={faChartGantt}
                iconTint="primary"
                large
                active={view === "gantt"}
                onClick={() => goToView("gantt")}
              />
              <RibbonButton
                label="Task Sheet"
                icon={faTable}
                iconTint="primary"
                active={view === "task-sheet"}
                onClick={() => goToView("task-sheet")}
              />
              <RibbonButton
                label="Calendar"
                icon={faCalendar}
                iconTint="primary"
                active={view === "calendar"}
                onClick={() => goToView("calendar")}
              />
              <RibbonButton
                label="Network"
                icon={faDiagramProject}
                iconTint="primary"
                active={view === "network"}
                onClick={() => goToView("network")}
              />
            </RibbonGroup>
            <RibbonGroup label="Data">
              <RibbonButton
                label="Knowledge"
                icon={faBook}
                iconTint="info"
                active={view === "knowledge"}
                onClick={goToKnowledge}
              />
            </RibbonGroup>
            <RibbonGroup label="Show/Hide">
              <RibbonButtonStack>
                <RibbonMenuButton
                  label={showTimeline ? "Hide Timeline" : "Timeline"}
                  icon={faTimeline}
                  active={showTimeline}
                  onClick={() => {
                    toggleTimeline();
                    setStatus(
                      showTimeline
                        ? "Timeline hidden above Gantt chart"
                        : "Timeline shown above Gantt chart",
                      { variant: "info" },
                    );
                  }}
                />
                {view === "gantt" ? (
                  gridHidden ? (
                    <RibbonMenuButton
                      label="Show Table"
                      icon={faCompress}
                      onClick={() => {
                        restoreChart();
                        setStatus("Task table restored beside Gantt chart", {
                          variant: "info",
                        });
                      }}
                    />
                  ) : (
                    <RibbonMenuButton
                      label="Expand Chart"
                      icon={faExpand}
                      onClick={() => {
                        expandChart();
                        setStatus("Gantt chart expanded to full width", {
                          variant: "info",
                        });
                      }}
                    />
                  )
                ) : null}
                <RibbonMenuButton
                  label={agentOpen ? "Hide Agent" : "Agent Panel"}
                  icon={faRobot}
                  iconTint="accent"
                  onClick={onToggleAgent}
                />
              </RibbonButtonStack>
            </RibbonGroup>
          </div>
        ) : null}

        {activeTab === "project" ? (
          <div className="flex gap-1">
            <RibbonGroup label="Properties">
              <RibbonButton
                label="Project Info"
                icon={faCircleInfo}
                iconTint="info"
                large
                active={view === "settings"}
                onClick={() => goToView("settings")}
              />
              <RibbonButton
                label="Working Time"
                icon={faClock}
                iconTint="neutral"
                large
                active={view === "working-time"}
                onClick={() => goToView("working-time")}
              />
            </RibbonGroup>
            <RibbonGroup label="Navigate">
              <RibbonButton
                label="Project Center"
                icon={faBuilding}
                iconTint="secondary"
                large
                active={view === "projects"}
                onClick={() => goToView("projects")}
              />
            </RibbonGroup>
          </div>
        ) : null}

        {activeTab === "knowledge" ? (
          <div className="flex gap-1">
            <RibbonGroup label="Browse">
              <RibbonButton
                label="Knowledge Base"
                icon={faBook}
                iconTint="info"
                large
                active={view === "knowledge"}
                onClick={goToKnowledge}
              />
            </RibbonGroup>
            <RibbonGroup label="New">
              <RibbonButton
                label="New Article"
                icon={faFileLines}
                iconTint="secondary"
                large
                onClick={() => {
                  goToKnowledge();
                  openNewArticle();
                }}
              />
              <RibbonButton
                label="New Category"
                icon={faFolderClosed}
                iconTint="neutral"
                onClick={() => {
                  goToKnowledge();
                  openNewCategory();
                }}
              />
            </RibbonGroup>
            <RibbonGroup label="Search">
              <RibbonButton
                label="Search"
                icon={faMagnifyingGlass}
                iconTint="primary"
                onClick={() => {
                  goToKnowledge();
                  requestSearchFocus();
                }}
              />
              <RibbonButton
                label="Re-index"
                icon={faDatabase}
                iconTint="accent"
                disabled={!selectedArticle}
                onClick={() => {
                  goToKnowledge();
                  runReindex();
                }}
              />
            </RibbonGroup>
          </div>
        ) : null}

        {activeTab === "help" ? (
          <div className="flex gap-1">
            <RibbonGroup label="Support">
              <RibbonButton
                label="About Swift"
                icon={faCircleInfo}
                iconTint="info"
                large
                onClick={() => setAboutOpen(true)}
              />
            </RibbonGroup>
            <RibbonGroup label="Notifications">
              <RibbonButtonStack>
                <RibbonMenuButton
                  label="Success toast"
                  icon={faCircleCheck}
                  iconTint="accent"
                  onClick={() => toast.success("Operation completed successfully.")}
                />
                <RibbonMenuButton
                  label="Info toast"
                  icon={faCircleInfo}
                  iconTint="info"
                  onClick={() => toast.info("Status update — no action required.")}
                />
              </RibbonButtonStack>
              <RibbonButtonStack>
                <RibbonMenuButton
                  label="Warning toast"
                  icon={faNoteSticky}
                  iconTint="warning"
                  onClick={() => toast.warning("Schedule conflict detected in mock data.")}
                />
                <RibbonMenuButton
                  label="Error toast"
                  icon={faBell}
                  iconTint="warning"
                  onClick={() => toast.error("Could not save — database not connected.")}
                />
              </RibbonButtonStack>
            </RibbonGroup>
          </div>
        ) : null}
      </Ribbon>

      <div className="flex h-6 items-center border-t border-nest-border bg-nest-surface px-3 text-[11px] text-nest-muted">
        <span className="font-semibold text-nest-primary">
          {PROJECT_VIEW_LABELS[view]}
        </span>
      </div>

      <ConfirmDialog
        open={markOnTrackOpen && canMarkOnTrack}
        title="Mark on Track"
        icon={faCircleCheck}
        confirmLabel="Mark on Track"
        message={
          selectedTask
            ? `Mark "${selectedTask.name}" on track as of ${statusDateLabel}?\n\n` +
              `% complete: ${selectedTask.percentComplete}%\n` +
              (selectedTask.percentComplete > 0
                ? "Remaining work will be rescheduled from the status date while keeping the task on its current finish plan."
                : "The current start and finish dates will be kept as the baseline schedule.")
            : ""
        }
        onConfirm={confirmMarkOnTrack}
        onCancel={() => setMarkOnTrackOpen(false)}
      />

      <ConfirmDialog
        open={respectLinksOpen && canRespectLinks}
        title="Respect Links"
        icon={faLink}
        confirmLabel="Respect Links"
        message={
          selectedTask
            ? `Apply finish-to-start links for "${selectedTask.name}"?\n\n` +
              `Predecessors: ${predecessorCount}\n` +
              `Successors: ${successorCount}\n\n` +
              "The selected task will snap to its predecessors, then successor tasks will move to follow the updated schedule."
            : ""
        }
        onConfirm={confirmRespectLinks}
        onCancel={() => setRespectLinksOpen(false)}
      />

      <AboutSwiftDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

function QuickButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: IconDefinition;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-nest-sm p-1 text-white/80 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon icon={icon} className="size-3.5" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
