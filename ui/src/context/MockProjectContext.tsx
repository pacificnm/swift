import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  hasSwiftData,
  listProjects,
  listTaskLinks,
  listTasks,
  createProject as apiCreateProject,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  updateProject as apiUpdateProject,
  archiveProject as apiArchiveProject,
  deleteProject as apiDeleteProject,
  deleteTask as apiDeleteTask,
  setTaskPredecessors as apiSetTaskPredecessors,
} from "../lib/swift";
import {
  dbProjectsToMock,
  dbTasksToMock,
  mockProjectToDb,
  mockTaskToDb,
  newProjectToDb,
  newTaskToDb,
} from "../lib/swiftAdapters";
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
  ganttBarForDates,
  indentTasksOutline,
  outdentTasksOutline,
  parsePredecessorIds,
  parseTaskDateDisplay,
  taskHasScheduleLinks,
  canIndentTasks,
  canOutdentTasks,
  todayIsoDate,
  type MarkOnTrackResult,
  type MockProject,
  type MockTask,
  type NewProjectInput,
  type NewTaskInput,
  type OutlineChangeResult,
  type ProjectUpdates,
  type RespectLinksResult,
  type TaskUpdates,
  visibleTasks,
} from "../mock/demo";

/**
 * Placeholder shown when there are no projects yet (fresh database). Keeps the
 * workspace views renderable; its empty `id` signals "no real project" so writes
 * are skipped until the user creates one.
 */
const EMPTY_PROJECT: MockProject = {
  id: "",
  name: "No project yet",
  slug: "",
  color: "#64748b",
  pinned: false,
  archived: false,
  percentComplete: 0,
  startDate: todayIsoDate(),
  finish: "—",
  manager: "You",
};

/** Applies a `ProjectUpdates` patch to a project, returning the next project (pure). */
function applyProjectUpdate(current: MockProject, updates: ProjectUpdates): MockProject {
  const next: MockProject = { ...current };

  if (updates.name !== undefined) {
    next.name = updates.name.trim() || current.name;
  }
  if (updates.slug !== undefined) {
    next.slug = updates.slug.trim() || current.slug;
  }
  if (updates.description !== undefined) {
    const trimmed = updates.description?.trim();
    next.description = trimmed || undefined;
  }
  if (updates.color !== undefined) {
    next.color = updates.color;
  }
  if (updates.manager !== undefined) {
    next.manager = updates.manager.trim() || "You";
  }
  if (updates.pinned !== undefined) {
    next.pinned = updates.pinned;
  }
  if (updates.archived !== undefined) {
    next.archived = updates.archived;
  }
  if (updates.percentComplete !== undefined) {
    next.percentComplete = Math.min(100, Math.max(0, updates.percentComplete));
  }
  if (updates.startDate !== undefined) {
    next.startDate = updates.startDate;
  }
  if (updates.finishDate !== undefined) {
    next.finish = updates.finishDate
      ? formatProjectDate(updates.finishDate)
      : "—";
  }

  return next;
}

function persistProject(project: MockProject, projects: MockProject[]): void {
  if (!hasSwiftData()) {
    return;
  }
  const sortOrder = projects.findIndex((p) => p.id === project.id);
  apiUpdateProject(mockProjectToDb(project, sortOrder >= 0 ? sortOrder : 0)).catch(
    (error) => console.error("Swift: update project failed", error),
  );
}

/** Applies a `TaskUpdates` patch to a task, returning the next task (pure). */
function applyTaskUpdate(current: MockTask, updates: TaskUpdates): MockTask | null {
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
    // Keep notes verbatim while editing — trimming on every keystroke strips
    // spaces/newlines as the user types. Only an empty string clears the field.
    nextTask.notes = updates.notes.length > 0 ? updates.notes : undefined;
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
      return null;
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
      bar: ganttBarForDates(
        startIso,
        finishIso,
        nextTask.isMilestone,
        durationDays,
      ),
    };
  }

  return nextTask;
}

/** Best-effort persistence of task rows whose outline changed (indent/outdent). */
function persistOutlineChanges(
  projectId: string,
  before: MockTask[],
  after: MockTask[],
): void {
  if (!hasSwiftData()) {
    return;
  }
  const beforeById = new Map(before.map((t) => [t.id, t]));
  after.forEach((task, index) => {
    const prior = beforeById.get(task.id);
    if (
      !prior ||
      prior.outlineLevel !== task.outlineLevel ||
      prior.isSummary !== task.isSummary
    ) {
      apiUpdateTask(mockTaskToDb(task, projectId, index)).catch((error) =>
        console.error("Swift: persist outline change failed", error),
      );
    }
  });
}

type MockProjectContextValue = {
  project: MockProject;
  tasks: MockTask[];
  projects: MockProject[];
  openProject: (id: string) => void;
  createProject: (input: NewProjectInput) => MockProject;
  updateProject: (id: string, updates: ProjectUpdates) => void;
  archiveProject: (id: string) => void;
  deleteProject: (id: string) => void;
  toggleProjectPinned: (id: string) => void;
  createTask: (input: NewTaskInput) => MockTask;
  deleteTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: TaskUpdates) => void;
  markTaskOnTrack: (taskId: string) => MarkOnTrackResult;
  respectTaskLinks: (taskId: string) => RespectLinksResult;
  indentTask: () => OutlineChangeResult;
  outdentTask: () => OutlineChangeResult;
  visibleTasks: MockTask[];
  isSummaryCollapsed: (taskId: string) => boolean;
  toggleSummaryCollapsed: (taskId: string) => void;
  selectedTaskIds: string[];
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectTask: (taskId: string, options?: { additive?: boolean; range?: boolean }) => void;
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
  // Desktop shell uses real PostgreSQL data only (starts empty, loads from DB).
  // Browser-only dev keeps the mock seed so the UI is explorable without Tauri.
  const [projects, setProjects] = useState<MockProject[]>(() =>
    hasSwiftData() ? [] : [...MOCK_PROJECTS],
  );
  const [tasksByProject, setTasksByProject] = useState<Record<string, MockTask[]>>(
    () => (hasSwiftData() ? {} : buildInitialTasksByProject()),
  );
  const [projectId, setProjectId] = useState(() => (hasSwiftData() ? "" : "p-nest"));
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(() =>
    hasSwiftData() ? [] : ["2"],
  );
  const selectedTaskId = selectedTaskIds[0] ?? null;
  const setSelectedTaskId = useCallback((id: string | null) => {
    setSelectedTaskIds(id ? [id] : []);
  }, []);
  const [showTaskDetails, setShowTaskDetails] = useState(true);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [collapsedSummaries, setCollapsedSummaries] = useState<Set<string>>(
    () => new Set(),
  );

  const selectTask = useCallback(
    (taskId: string, options?: { additive?: boolean; range?: boolean }) => {
      const gridTasks = visibleTasks(
        tasksByProject[projectId] ?? [],
        collapsedSummaries,
      );
      const clickedIndex = gridTasks.findIndex((task) => task.id === taskId);
      if (clickedIndex < 0) {
        return;
      }

      setSelectedTaskIds((prev) => {
        if (options?.range && prev.length > 0) {
          const anchorId = prev[0];
          const anchorIndex = gridTasks.findIndex((task) => task.id === anchorId);
          if (anchorIndex >= 0) {
            const start = Math.min(anchorIndex, clickedIndex);
            const end = Math.max(anchorIndex, clickedIndex);
            return gridTasks.slice(start, end + 1).map((task) => task.id);
          }
        }

        if (options?.additive) {
          if (prev.includes(taskId)) {
            return prev.filter((id) => id !== taskId);
          }
          return [...prev, taskId];
        }

        return [taskId];
      });
      setShowTaskDetails(true);
    },
    [projectId, tasksByProject, collapsedSummaries],
  );

  // Load real data from PostgreSQL (via the Swift Tauri plugin) when running
  // in the desktop shell. In browser-only dev the mock seed is kept.
  useEffect(() => {
    if (!hasSwiftData()) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const dbProjects = await listProjects();
        if (cancelled) {
          return;
        }
        const loadedProjects = dbProjectsToMock(dbProjects);
        const entries = await Promise.all(
          dbProjects.map(async (p) => {
            const [tasks, links] = await Promise.all([
              listTasks(p.id),
              listTaskLinks(p.id),
            ]);
            return [p.id, dbTasksToMock(tasks, links)] as const;
          }),
        );
        if (cancelled) {
          return;
        }
        const loadedTasks: Record<string, MockTask[]> = {};
        for (const [id, tasks] of entries) {
          loadedTasks[id] = tasks;
        }
        setProjects(loadedProjects);
        setTasksByProject(loadedTasks);
        setProjectId((prev) =>
          loadedProjects.some((p) => p.id === prev) ? prev : loadedProjects[0]?.id ?? "",
        );
        setSelectedTaskId(null);
      } catch (error) {
        console.error("Swift: failed to load data from database", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      const id = crypto.randomUUID();
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
      if (hasSwiftData()) {
        apiCreateProject(newProjectToDb(id, input)).catch((error) =>
          console.error("Swift: create project failed", error),
        );
      }
      return project;
    },
    [],
  );

  const updateProject = useCallback(
    (id: string, updates: ProjectUpdates) => {
      setProjects((prev) => {
        const index = prev.findIndex((p) => p.id === id);
        if (index < 0) {
          return prev;
        }
        const nextProject = applyProjectUpdate(prev[index], updates);
        const next = [...prev];
        next[index] = nextProject;
        persistProject(nextProject, next);
        return next;
      });
    },
    [],
  );

  const archiveProject = useCallback(
    (id: string) => {
      setProjects((prev) => {
        const index = prev.findIndex((p) => p.id === id);
        if (index < 0) {
          return prev;
        }
        const next = [...prev];
        next[index] = { ...next[index], archived: true, percentComplete: 100 };
        return next;
      });
      setTasksByProject((prev) => {
        const list = prev[id];
        if (!list) {
          return prev;
        }
        return {
          ...prev,
          [id]: list.map((task) =>
            task.percentComplete >= 100
              ? task
              : { ...task, percentComplete: 100 },
          ),
        };
      });
      if (hasSwiftData()) {
        apiArchiveProject(id).catch((error) =>
          console.error("Swift: archive project failed", error),
        );
      }
    },
    [],
  );

  const toggleProjectPinned = useCallback(
    (id: string) => {
      const current = projects.find((p) => p.id === id);
      if (!current) {
        return;
      }
      updateProject(id, { pinned: !current.pinned });
    },
    [projects, updateProject],
  );

  const deleteProject = useCallback(
    (id: string) => {
      if (!projects.some((p) => p.id === id)) {
        return;
      }
      const remaining = projects.filter((p) => p.id !== id);
      setProjects(remaining);
      setTasksByProject((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (projectId === id) {
        setProjectId(remaining[0]?.id ?? "");
        setSelectedTaskId(null);
      }
      if (hasSwiftData()) {
        apiDeleteProject(id).catch((error) =>
          console.error("Swift: delete project failed", error),
        );
      }
    },
    [projects, projectId],
  );

  const createTask = useCallback(
    (input: NewTaskInput): MockTask => {
      const current = tasksByProject[projectId] ?? [];
      const insertAt =
        selectedTaskId !== null
          ? Math.max(0, current.findIndex((t) => t.id === selectedTaskId) + 1)
          : current.length;

      const task: MockTask = {
        id: crypto.randomUUID(),
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
        bar: ganttBarForDates(
          input.startDate,
          input.finishDate,
          input.isMilestone,
          input.durationDays,
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
      if (hasSwiftData() && projectId) {
        apiCreateTask(newTaskToDb(task.id, projectId, input, insertAt)).catch(
          (error) => console.error("Swift: create task failed", error),
        );
      }
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
      if (hasSwiftData()) {
        apiDeleteTask(taskId).catch((error) =>
          console.error("Swift: delete task failed", error),
        );
      }
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
        const nextTask = applyTaskUpdate(list[index], updates);
        if (!nextTask) {
          return prev;
        }
        const next = [...list];
        next[index] = nextTask;
        return { ...prev, [projectId]: next };
      });

      if (!hasSwiftData()) {
        return;
      }
      const snapshot = tasksByProject[projectId] ?? [];
      const snapIndex = snapshot.findIndex((t) => t.id === taskId);
      if (snapIndex < 0) {
        return;
      }
      const nextTask = applyTaskUpdate(snapshot[snapIndex], updates);
      if (!nextTask) {
        return;
      }
      apiUpdateTask(mockTaskToDb(nextTask, projectId, snapIndex)).catch((error) =>
        console.error("Swift: update task failed", error),
      );
      if (updates.predecessors !== undefined) {
        const predecessorIds = parsePredecessorIds(nextTask.predecessors)
          .map((rowNumber) => snapshot[Number(rowNumber) - 1]?.id)
          .filter((id): id is string => Boolean(id));
        apiSetTaskPredecessors(projectId, taskId, predecessorIds).catch((error) =>
          console.error("Swift: set predecessors failed", error),
        );
      }
    },
    [projectId, tasksByProject],
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

  const indentTask = useCallback((): OutlineChangeResult => {
    const list = tasksByProject[projectId] ?? [];
    if (selectedTaskIds.length === 0) {
      return { ok: false, message: "Select one or more tasks first." };
    }
    if (!canIndentTasks(list, selectedTaskIds)) {
      return {
        ok: false,
        message:
          selectedTaskIds.length === 1
            ? "Cannot indent — no valid parent row above this task."
            : "Cannot indent — selected tasks must be at the same level with a valid parent row above.",
      };
    }

    const next = indentTasksOutline(list, selectedTaskIds);
    if (!next) {
      return { ok: false, message: "Cannot indent the selected task(s)." };
    }

    const count = selectedTaskIds.length;
    setTasksByProject((prev) => ({ ...prev, [projectId]: next }));
    persistOutlineChanges(projectId, list, next);
    return {
      ok: true,
      message:
        count === 1
          ? `Indented 1 task.`
          : `Indented ${count} tasks.`,
    };
  }, [projectId, selectedTaskIds, tasksByProject]);

  const outdentTask = useCallback((): OutlineChangeResult => {
    const list = tasksByProject[projectId] ?? [];
    if (selectedTaskIds.length === 0) {
      return { ok: false, message: "Select one or more tasks first." };
    }
    if (!canOutdentTasks(list, selectedTaskIds)) {
      return {
        ok: false,
        message:
          selectedTaskIds.length === 1
            ? "Cannot outdent — task is already at the top outline level."
            : "Cannot outdent — selected tasks must be at the same outline level below the top.",
      };
    }

    const next = outdentTasksOutline(list, selectedTaskIds);
    if (!next) {
      return { ok: false, message: "Cannot outdent the selected task(s)." };
    }

    const count = selectedTaskIds.length;
    setTasksByProject((prev) => ({ ...prev, [projectId]: next }));
    persistOutlineChanges(projectId, list, next);
    return {
      ok: true,
      message:
        count === 1
          ? `Outdented 1 task.`
          : `Outdented ${count} tasks.`,
    };
  }, [projectId, selectedTaskIds, tasksByProject]);

  const value = useMemo(() => {
    const project =
      projects.find((p) => p.id === projectId) ?? projects[0] ?? EMPTY_PROJECT;
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
      updateProject,
      archiveProject,
      deleteProject,
      toggleProjectPinned,
      createTask,
      deleteTask,
      updateTask,
      markTaskOnTrack,
      respectTaskLinks,
      indentTask,
      outdentTask,
      isSummaryCollapsed,
      toggleSummaryCollapsed,
      selectedTaskIds,
      selectedTaskId,
      setSelectedTaskId,
      selectTask,
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
    selectedTaskIds,
    showTaskDetails,
    newProjectOpen,
    newTaskOpen,
    createProject,
    updateProject,
    archiveProject,
    deleteProject,
    toggleProjectPinned,
    createTask,
    deleteTask,
    updateTask,
    markTaskOnTrack,
    respectTaskLinks,
    indentTask,
    outdentTask,
    toggleSummaryCollapsed,
    isSummaryCollapsed,
    selectTask,
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
