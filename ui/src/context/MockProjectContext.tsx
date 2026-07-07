import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  MOCK_PROJECTS,
  buildInitialTasksByProject,
  addCalendarDays,
  computeMarkOnTrackUpdates,
  computeRespectLinksUpdates,
  durationDaysFromRange,
  formatProjectDate,
  formatTaskDate,
  formatTaskDuration,
  ganttBarForNewTask,
  indentTaskOutline,
  outdentTaskOutline,
  parseTaskDateDisplay,
  taskHasScheduleLinks,
  canIndentTask,
  canOutdentTask,
  todayIsoDate,
  type MarkOnTrackResult,
  type MockProject,
  type MockTask,
  type NewProjectInput,
  type NewTaskInput,
  type OutlineChangeResult,
  type RespectLinksResult,
  type TaskUpdates,
  visibleTasks,
} from "../mock/demo";

type MockProjectContextValue = {
  project: MockProject;
  tasks: MockTask[];
  projects: MockProject[];
  openProject: (id: string) => void;
  createProject: (input: NewProjectInput) => MockProject;
  createTask: (input: NewTaskInput) => MockTask;
  deleteTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: TaskUpdates) => void;
  markTaskOnTrack: (taskId: string) => MarkOnTrackResult;
  respectTaskLinks: (taskId: string) => RespectLinksResult;
  indentTask: (taskId: string) => OutlineChangeResult;
  outdentTask: (taskId: string) => OutlineChangeResult;
  visibleTasks: MockTask[];
  isSummaryCollapsed: (taskId: string) => boolean;
  toggleSummaryCollapsed: (taskId: string) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedTask: MockTask | null;
  showTaskDetails: boolean;
  setShowTaskDetails: (show: boolean) => void;
  newProjectOpen: boolean;
  openNewProject: () => void;
  closeNewProject: () => void;
  newTaskOpen: boolean;
  openNewTask: () => void;
  closeNewTask: () => void;
};

const MockProjectContext = createContext<MockProjectContextValue | null>(null);

export function MockProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<MockProject[]>(() => [...MOCK_PROJECTS]);
  const [tasksByProject, setTasksByProject] = useState<Record<string, MockTask[]>>(
    buildInitialTasksByProject,
  );
  const [projectId, setProjectId] = useState("p-nest");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>("2");
  const [showTaskDetails, setShowTaskDetails] = useState(true);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [collapsedSummaries, setCollapsedSummaries] = useState<Set<string>>(
    () => new Set(),
  );

  const openNewProject = useCallback(() => setNewProjectOpen(true), []);
  const closeNewProject = useCallback(() => setNewProjectOpen(false), []);
  const openNewTask = useCallback(() => setNewTaskOpen(true), []);
  const closeNewTask = useCallback(() => setNewTaskOpen(false), []);

  const toggleSummaryCollapsed = useCallback((taskId: string) => {
    setCollapsedSummaries((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const isSummaryCollapsed = useCallback(
    (taskId: string) => collapsedSummaries.has(taskId),
    [collapsedSummaries],
  );

  const createProject = useCallback(
    (input: NewProjectInput): MockProject => {
      const id = `p-${crypto.randomUUID().slice(0, 8)}`;
      const project: MockProject = {
        id,
        name: input.name.trim(),
        slug: input.slug.trim(),
        description: input.description?.trim() || undefined,
        color: input.color,
        pinned: input.pinned,
        archived: false,
        percentComplete: 0,
        startDate: input.startDate,
        finish: input.finishDate ? formatProjectDate(input.finishDate) : "—",
        manager: input.manager.trim() || "You",
      };
      setProjects((prev) => [project, ...prev]);
      setTasksByProject((prev) => ({ ...prev, [id]: [] }));
      setProjectId(id);
      setSelectedTaskId(null);
      setShowTaskDetails(true);
      setNewProjectOpen(false);
      return project;
    },
    [],
  );

  const createTask = useCallback(
    (input: NewTaskInput): MockTask => {
      const current = tasksByProject[projectId] ?? [];
      const insertAt =
        selectedTaskId !== null
          ? Math.max(0, current.findIndex((t) => t.id === selectedTaskId) + 1)
          : current.length;

      const task: MockTask = {
        id: `t-${crypto.randomUUID().slice(0, 8)}`,
        projectId,
        outlineLevel: input.outlineLevel,
        isSummary: input.isSummary,
        isMilestone: input.isMilestone,
        name: input.name.trim(),
        duration: formatTaskDuration(input.durationDays, input.isMilestone),
        start: formatTaskDate(input.startDate),
        finish: formatTaskDate(input.finishDate),
        predecessors: input.predecessors.trim(),
        resources: input.resources.trim(),
        percentComplete: input.percentComplete,
        notes: input.notes?.trim() || undefined,
        bar: ganttBarForNewTask(
          current.slice(0, insertAt),
          input.durationDays,
          input.isMilestone,
        ),
      };

      setTasksByProject((prev) => {
        const list = prev[projectId] ?? [];
        const next = [...list.slice(0, insertAt), task, ...list.slice(insertAt)];
        return { ...prev, [projectId]: next };
      });
      setSelectedTaskId(task.id);
      setShowTaskDetails(true);
      setNewTaskOpen(false);
      return task;
    },
    [projectId, selectedTaskId, tasksByProject],
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      setTasksByProject((prev) => {
        const list = prev[projectId] ?? [];
        const index = list.findIndex((t) => t.id === taskId);
        if (index < 0) {
          return prev;
        }
        const next = list.filter((t) => t.id !== taskId);
        const neighbor = next[index] ?? next[index - 1] ?? null;
        setSelectedTaskId(neighbor?.id ?? null);
        return { ...prev, [projectId]: next };
      });
    },
    [projectId],
  );

  const updateTask = useCallback(
    (taskId: string, updates: TaskUpdates) => {
      setTasksByProject((prev) => {
        const list = prev[projectId] ?? [];
        const index = list.findIndex((t) => t.id === taskId);
        if (index < 0) {
          return prev;
        }

        const current = list[index];
        let nextTask: MockTask = { ...current };

        if (updates.name !== undefined) {
          nextTask.name = updates.name.trim() || current.name;
        }
        if (updates.percentComplete !== undefined) {
          nextTask.percentComplete = Math.min(100, Math.max(0, updates.percentComplete));
        }
        if (updates.predecessors !== undefined) {
          nextTask.predecessors = updates.predecessors.trim();
        }
        if (updates.resources !== undefined) {
          nextTask.resources = updates.resources.trim();
        }
        if (updates.notes !== undefined) {
          const trimmed = updates.notes.trim();
          nextTask.notes = trimmed || undefined;
        }
        if (updates.priority !== undefined) {
          nextTask.priority = updates.priority;
        }
        if (updates.constraintType !== undefined) {
          nextTask.constraintType = updates.constraintType;
        }
        if (updates.constraintDate !== undefined) {
          nextTask.constraintDate = updates.constraintDate || undefined;
        }
        if (updates.deadline !== undefined) {
          nextTask.deadline = updates.deadline || undefined;
        }
        if (updates.effortDriven !== undefined) {
          nextTask.effortDriven = updates.effortDriven;
        }
        if (updates.taskType !== undefined) {
          nextTask.taskType = updates.taskType;
        }

        const startIso =
          updates.startDate ??
          parseTaskDateDisplay(nextTask.start) ??
          parseTaskDateDisplay(current.start);
        const finishIsoFromTask =
          parseTaskDateDisplay(nextTask.finish) ?? parseTaskDateDisplay(current.finish);

        if (
          updates.startDate !== undefined ||
          updates.finishDate !== undefined ||
          updates.durationDays !== undefined
        ) {
          if (!startIso) {
            return prev;
          }

          let finishIso = updates.finishDate ?? finishIsoFromTask ?? startIso;
          if (nextTask.isMilestone) {
            finishIso = startIso;
          } else if (updates.durationDays !== undefined) {
            finishIso =
              updates.durationDays <= 0
                ? startIso
                : addCalendarDays(startIso, updates.durationDays - 1);
          } else if (finishIso < startIso) {
            finishIso = startIso;
          }

          const durationDays = nextTask.isMilestone
            ? 0
            : durationDaysFromRange(startIso, finishIso);

          nextTask = {
            ...nextTask,
            start: formatTaskDate(startIso),
            finish: formatTaskDate(finishIso),
            duration: formatTaskDuration(durationDays, nextTask.isMilestone),
          };
        }

        const next = [...list];
        next[index] = nextTask;
        return { ...prev, [projectId]: next };
      });
    },
    [projectId],
  );

  const markTaskOnTrack = useCallback(
    (taskId: string): MarkOnTrackResult => {
      const list = tasksByProject[projectId] ?? [];
      const task = list.find((t) => t.id === taskId);
      if (!task) {
        return { ok: false, message: "Select a task first." };
      }
      if (task.isSummary) {
        return { ok: false, message: "Summary tasks cannot be marked on track." };
      }
      if (task.percentComplete >= 100) {
        return { ok: false, message: "Task is already complete." };
      }

      const statusDateIso = todayIsoDate();
      const updates = computeMarkOnTrackUpdates(task, statusDateIso);
      if (Object.keys(updates).length > 0) {
        updateTask(taskId, updates);
      }

      const statusLabel = formatProjectDate(statusDateIso);
      return {
        ok: true,
        message:
          task.percentComplete > 0
            ? `Remaining work on "${task.name}" is scheduled from ${statusLabel}.`
            : `Schedule for "${task.name}" confirmed as of ${statusLabel}.`,
      };
    },
    [projectId, tasksByProject, updateTask],
  );

  const respectTaskLinks = useCallback(
    (taskId: string): RespectLinksResult => {
      const list = tasksByProject[projectId] ?? [];
      const task = list.find((t) => t.id === taskId);
      if (!task) {
        return { ok: false, message: "Select a task first." };
      }
      if (task.isSummary) {
        return { ok: false, message: "Summary tasks cannot respect links." };
      }
      if (!taskHasScheduleLinks(list, taskId)) {
        return { ok: false, message: "Task has no predecessor or successor links." };
      }

      const plan = computeRespectLinksUpdates(list, taskId);
      if (plan.size === 0) {
        return {
          ok: true,
          message: `"${task.name}" already honors its dependency links.`,
          movedCount: 0,
        };
      }

      for (const [id, updates] of plan) {
        updateTask(id, updates);
      }

      return {
        ok: true,
        message: `Rescheduled ${plan.size} linked task${plan.size === 1 ? "" : "s"} to honor finish-to-start links from "${task.name}".`,
        movedCount: plan.size,
      };
    },
    [projectId, tasksByProject, updateTask],
  );

  const indentTask = useCallback(
    (taskId: string): OutlineChangeResult => {
      const list = tasksByProject[projectId] ?? [];
      const task = list.find((t) => t.id === taskId);
      if (!task) {
        return { ok: false, message: "Select a task first." };
      }
      if (!canIndentTask(list, taskId)) {
        return {
          ok: false,
          message: "Cannot indent — no valid parent row above this task.",
        };
      }

      const next = indentTaskOutline(list, taskId);
      if (!next) {
        return { ok: false, message: `Cannot indent "${task.name}".` };
      }

      setTasksByProject((prev) => ({ ...prev, [projectId]: next }));
      return {
        ok: true,
        message: `Indented "${task.name}" to outline level ${task.outlineLevel + 2}.`,
      };
    },
    [projectId, tasksByProject],
  );

  const outdentTask = useCallback(
    (taskId: string): OutlineChangeResult => {
      const list = tasksByProject[projectId] ?? [];
      const task = list.find((t) => t.id === taskId);
      if (!task) {
        return { ok: false, message: "Select a task first." };
      }
      if (!canOutdentTask(list, taskId)) {
        return {
          ok: false,
          message: "Cannot outdent — task is already at the top outline level.",
        };
      }

      const next = outdentTaskOutline(list, taskId);
      if (!next) {
        return { ok: false, message: `Cannot outdent "${task.name}".` };
      }

      setTasksByProject((prev) => ({ ...prev, [projectId]: next }));
      return {
        ok: true,
        message: `Outdented "${task.name}" to outline level ${task.outlineLevel}.`,
      };
    },
    [projectId, tasksByProject],
  );

  const value = useMemo(() => {
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    const tasks = tasksByProject[project.id] ?? [];
    const gridTasks = visibleTasks(tasks, collapsedSummaries);
    const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

    return {
      project,
      tasks,
      visibleTasks: gridTasks,
      projects,
      openProject: (id: string) => {
        setProjectId(id);
        setSelectedTaskId(null);
      },
      createProject,
      createTask,
      deleteTask,
      updateTask,
      markTaskOnTrack,
      respectTaskLinks,
      indentTask,
      outdentTask,
      isSummaryCollapsed,
      toggleSummaryCollapsed,
      selectedTaskId,
      setSelectedTaskId,
      selectedTask,
      showTaskDetails,
      setShowTaskDetails,
      newProjectOpen,
      openNewProject,
      closeNewProject,
      newTaskOpen,
      openNewTask,
      closeNewTask,
    };
  }, [
    projects,
    projectId,
    tasksByProject,
    collapsedSummaries,
    selectedTaskId,
    showTaskDetails,
    newProjectOpen,
    newTaskOpen,
    createProject,
    createTask,
    deleteTask,
    updateTask,
    markTaskOnTrack,
    respectTaskLinks,
    indentTask,
    outdentTask,
    toggleSummaryCollapsed,
    isSummaryCollapsed,
    openNewProject,
    closeNewProject,
    openNewTask,
    closeNewTask,
  ]);

  return (
    <MockProjectContext.Provider value={value}>
      {children}
    </MockProjectContext.Provider>
  );
}

export function useMockProject(): MockProjectContextValue {
  const ctx = useContext(MockProjectContext);
  if (!ctx) {
    throw new Error("useMockProject must be used within MockProjectProvider");
  }
  return ctx;
}
