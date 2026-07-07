export type MockProject = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  pinned: boolean;
  archived: boolean;
  percentComplete: number;
  startDate: string;
  finish: string;
  manager: string;
};

export type ProjectUpdates = {
  name?: string;
  slug?: string;
  description?: string | null;
  color?: string;
  manager?: string;
  pinned?: boolean;
  archived?: boolean;
  percentComplete?: number;
  startDate?: string;
  /** ISO `yyyy-mm-dd`; pass `null` to clear the finish date. */
  finishDate?: string | null;
};

export type NewProjectInput = {
  name: string;
  slug: string;
  description?: string;
  color: string;
  startDate: string;
  finishDate?: string;
  manager: string;
  pinned: boolean;
};

export const PROJECT_COLOR_PRESETS = [
  "#003f2d",
  "#006a4d",
  "#69be28",
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#64748b",
] as const;

export function slugifyProjectName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function formatProjectDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Parse display dates from `formatProjectDate` back to ISO `yyyy-mm-dd`. */
export function parseProjectDateDisplay(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed || trimmed === "—") {
    return null;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export type NewTaskInput = {
  name: string;
  durationDays: number;
  startDate: string;
  finishDate: string;
  percentComplete: number;
  resources: string;
  predecessors: string;
  isMilestone: boolean;
  isSummary: boolean;
  outlineLevel: number;
  notes?: string;
};

const TASK_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatTaskDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const y = date.getFullYear() % 100;
  return `${TASK_DAY_NAMES[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}/${y}`;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Parse grid display dates like `Mon 7/7/26` to ISO `yyyy-mm-dd`. */
export function parseTaskDateDisplay(display: string): string | null {
  const match = display
    .trim()
    .match(/^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!match) {
    return null;
  }
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = 2000 + Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return iso;
}

export function calendarDaysBetween(startIso: string, finishIso: string): number {
  const start = new Date(`${startIso}T12:00:00`);
  const finish = new Date(`${finishIso}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) {
    return 0;
  }
  return Math.round((finish.getTime() - start.getTime()) / 86_400_000);
}

export function durationDaysFromRange(startIso: string, finishIso: string): number {
  return Math.max(1, calendarDaysBetween(startIso, finishIso) + 1);
}

export function formatTaskDuration(days: number, isMilestone: boolean): string {
  if (isMilestone || days <= 0) {
    return "0 days";
  }
  return days === 1 ? "1 day" : `${days} days`;
}

export function parseTaskDuration(duration: string): number {
  if (/0\s+days?/.test(duration)) {
    return 0;
  }
  const match = duration.match(/^(\d+)\s+days?$/);
  return match ? Number(match[1]) : 1;
}

export type TaskUpdates = {
  name?: string;
  durationDays?: number;
  percentComplete?: number;
  predecessors?: string;
  resources?: string;
  notes?: string;
  startDate?: string;
  finishDate?: string;
  priority?: string;
  constraintType?: string;
  constraintDate?: string;
  deadline?: string;
  effortDriven?: boolean;
  taskType?: string;
};

export type MarkOnTrackResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type RespectLinksResult =
  | { ok: true; message: string; movedCount: number }
  | { ok: false; message: string };

/** Tasks visible in the grid/Gantt after collapsing summary rows. */
export function visibleTasks(
  tasks: MockTask[],
  collapsedSummaryIds: ReadonlySet<string>,
): MockTask[] {
  const result: MockTask[] = [];
  const collapsedLevels: number[] = [];

  for (const task of tasks) {
    while (
      collapsedLevels.length > 0 &&
      task.outlineLevel <= collapsedLevels[collapsedLevels.length - 1]
    ) {
      collapsedLevels.pop();
    }

    if (collapsedLevels.some((level) => task.outlineLevel > level)) {
      continue;
    }

    result.push(task);

    if (task.isSummary && collapsedSummaryIds.has(task.id)) {
      collapsedLevels.push(task.outlineLevel);
    }
  }

  return result;
}

export type OutlineChangeResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export function findTaskIndex(tasks: MockTask[], taskId: string): number {
  return tasks.findIndex((task) => task.id === taskId);
}

export function taskSubtreeEnd(tasks: MockTask[], startIndex: number): number {
  const baseLevel = tasks[startIndex].outlineLevel;
  let end = startIndex + 1;
  while (end < tasks.length && tasks[end].outlineLevel > baseLevel) {
    end += 1;
  }
  return end;
}

export function canIndentTask(tasks: MockTask[], taskId: string): boolean {
  const index = findTaskIndex(tasks, taskId);
  if (index <= 0) {
    return false;
  }
  const task = tasks[index];
  const above = tasks[index - 1];
  return task.outlineLevel <= above.outlineLevel;
}

export function canOutdentTask(tasks: MockTask[], taskId: string): boolean {
  const index = findTaskIndex(tasks, taskId);
  if (index < 0) {
    return false;
  }
  return tasks[index].outlineLevel > 0;
}

export function refreshSummaryFlags(tasks: MockTask[]): MockTask[] {
  return tasks.map((task, index) => {
    const hasChildren =
      index + 1 < tasks.length &&
      tasks[index + 1].outlineLevel > task.outlineLevel;
    return { ...task, isSummary: hasChildren };
  });
}

export function indentTaskOutline(tasks: MockTask[], taskId: string): MockTask[] | null {
  return indentTasksOutline(tasks, [taskId]);
}

export function outdentTaskOutline(tasks: MockTask[], taskId: string): MockTask[] | null {
  return outdentTasksOutline(tasks, [taskId]);
}

/** Selected task indices that are not nested under another selected task. */
function topLevelSelectedIndices(tasks: MockTask[], taskIds: string[]): number[] {
  const indices = taskIds
    .map((id) => findTaskIndex(tasks, id))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);

  const roots: number[] = [];
  for (const index of indices) {
    const insidePriorSelection = roots.some((root) => {
      const end = taskSubtreeEnd(tasks, root);
      return index > root && index < end;
    });
    if (!insidePriorSelection) {
      roots.push(index);
    }
  }
  return roots;
}

export function canIndentTasks(tasks: MockTask[], taskIds: string[]): boolean {
  const roots = topLevelSelectedIndices(tasks, taskIds);
  if (roots.length === 0) {
    return false;
  }
  const first = roots[0];
  if (first <= 0) {
    return false;
  }
  const firstLevel = tasks[first].outlineLevel;
  if (!roots.every((index) => tasks[index].outlineLevel === firstLevel)) {
    return false;
  }
  // Valid as long as the row above is at the same or a deeper level: the new
  // level (firstLevel + 1) must not skip past above.level + 1.
  return firstLevel <= tasks[first - 1].outlineLevel;
}

export function canOutdentTasks(tasks: MockTask[], taskIds: string[]): boolean {
  const roots = topLevelSelectedIndices(tasks, taskIds);
  if (roots.length === 0) {
    return false;
  }
  const firstLevel = tasks[roots[0]].outlineLevel;
  if (firstLevel <= 0) {
    return false;
  }
  return roots.every((index) => tasks[index].outlineLevel === firstLevel);
}

/** Indent one or more tasks under the row above the first selection. */
export function indentTasksOutline(
  tasks: MockTask[],
  taskIds: string[],
): MockTask[] | null {
  if (!canIndentTasks(tasks, taskIds)) {
    return null;
  }

  const roots = topLevelSelectedIndices(tasks, taskIds);
  const next = tasks.map((task) => ({ ...task }));
  next[roots[0] - 1] = { ...next[roots[0] - 1], isSummary: true };

  for (const index of roots) {
    const end = taskSubtreeEnd(next, index);
    for (let i = index; i < end; i += 1) {
      next[i] = { ...next[i], outlineLevel: next[i].outlineLevel + 1 };
    }
  }

  return refreshSummaryFlags(next);
}

/** Outdent one or more tasks by one outline level. */
export function outdentTasksOutline(
  tasks: MockTask[],
  taskIds: string[],
): MockTask[] | null {
  if (!canOutdentTasks(tasks, taskIds)) {
    return null;
  }

  const roots = topLevelSelectedIndices(tasks, taskIds);
  const next = tasks.map((task) => ({ ...task }));

  for (const index of roots) {
    const end = taskSubtreeEnd(next, index);
    for (let i = index; i < end; i += 1) {
      next[i] = { ...next[i], outlineLevel: next[i].outlineLevel - 1 };
    }
  }

  return refreshSummaryFlags(next);
}

export function buildInitialTasksByProject(): Record<string, MockTask[]> {
  return {
    "p-nest": [...MOCK_TASKS],
    "p-swift": MOCK_TASKS.map((t) => ({
      ...t,
      id: `s-${t.id}`,
      projectId: "p-swift",
    })),
    "p-loon": MOCK_TASKS.slice(0, 4).map((t) => ({
      ...t,
      id: `l-${t.id}`,
      projectId: "p-loon",
      name: t.name.replace("Swift", "Loon"),
    })),
  };
}

export type MockTask = {
  id: string;
  projectId: string;
  outlineLevel: number;
  isSummary: boolean;
  isMilestone: boolean;
  name: string;
  duration: string;
  start: string;
  finish: string;
  predecessors: string;
  resources: string;
  percentComplete: number;
  notes?: string;
  priority?: string;
  constraintType?: string;
  constraintDate?: string;
  deadline?: string;
  effortDriven?: boolean;
  taskType?: string;
  /** Gantt bar position as % of timeline width */
  bar: { left: number; width: number };
};

/** Mock schedule adjustment when marking a task on track from the status date. */
export function computeMarkOnTrackUpdates(
  task: MockTask,
  statusDateIso: string,
): TaskUpdates {
  if (task.percentComplete <= 0) {
    return {};
  }

  const finishIso = parseTaskDateDisplay(task.finish);
  const startIso = parseTaskDateDisplay(task.start);
  if (!finishIso || !startIso) {
    return { startDate: statusDateIso };
  }

  const totalDays = durationDaysFromRange(startIso, finishIso);
  const remainingFraction = (100 - task.percentComplete) / 100;
  const remainingDays = Math.max(1, Math.ceil(totalDays * remainingFraction));

  return {
    startDate: statusDateIso,
    durationDays: remainingDays,
  };
}

export function parsePredecessorIds(predecessors: string): string[] {
  return predecessors
    .split(/[,;\s]+/)
    .map((part) => part.replace(/[^0-9].*$/, "").trim())
    .filter(Boolean);
}

export function findSuccessorTasks(
  tasks: MockTask[],
  predecessorId: string,
): MockTask[] {
  return tasks.filter((task) =>
    parsePredecessorIds(task.predecessors).includes(predecessorId),
  );
}

export function taskHasScheduleLinks(tasks: MockTask[], taskId: string): boolean {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return false;
  }
  if (parsePredecessorIds(task.predecessors).length > 0) {
    return true;
  }
  return findSuccessorTasks(tasks, taskId).length > 0;
}

function finishIsoForTask(
  task: MockTask,
  pendingUpdates: Map<string, TaskUpdates>,
): string | null {
  const upd = pendingUpdates.get(task.id);
  const startIso = upd?.startDate ?? parseTaskDateDisplay(task.start);
  if (!startIso) {
    return null;
  }
  if (task.isMilestone || parseTaskDuration(task.duration) === 0) {
    return startIso;
  }
  if (upd?.durationDays !== undefined) {
    return addCalendarDays(startIso, Math.max(0, upd.durationDays - 1));
  }
  if (upd?.finishDate) {
    return upd.finishDate;
  }
  return parseTaskDateDisplay(task.finish);
}

/** Reschedule linked tasks to honor finish-to-start dependencies (mock). */
export function computeRespectLinksUpdates(
  tasks: MockTask[],
  rootTaskId: string,
): Map<string, TaskUpdates> {
  const updates = new Map<string, TaskUpdates>();
  const root = tasks.find((task) => task.id === rootTaskId);
  if (!root || root.isSummary) {
    return updates;
  }

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const getFinish = (taskId: string): string | null => {
    const task = taskById.get(taskId);
    if (!task) {
      return null;
    }
    return finishIsoForTask(task, updates);
  };

  const predIds = parsePredecessorIds(root.predecessors);
  if (predIds.length > 0) {
    let latestFinish: string | null = null;
    for (const predId of predIds) {
      const finish = getFinish(predId);
      if (finish && (!latestFinish || finish > latestFinish)) {
        latestFinish = finish;
      }
    }
    if (latestFinish) {
      const newStart = addCalendarDays(latestFinish, 1);
      const currentStart = parseTaskDateDisplay(root.start);
      if (currentStart !== newStart) {
        updates.set(rootTaskId, {
          startDate: newStart,
          durationDays: Math.max(1, parseTaskDuration(root.duration)),
        });
      }
    }
  }

  const queue = [rootTaskId];
  const enqueued = new Set<string>([rootTaskId]);

  while (queue.length > 0) {
    const predId = queue.shift()!;
    for (const succ of findSuccessorTasks(tasks, predId)) {
      if (succ.isSummary) {
        continue;
      }

      const succPredIds = parsePredecessorIds(succ.predecessors);
      let latestFinish: string | null = null;
      for (const succPredId of succPredIds) {
        const finish = getFinish(succPredId);
        if (finish && (!latestFinish || finish > latestFinish)) {
          latestFinish = finish;
        }
      }
      if (!latestFinish) {
        continue;
      }

      const newStart = addCalendarDays(latestFinish, 1);
      const durationDays = Math.max(1, parseTaskDuration(succ.duration));
      const currentStart = parseTaskDateDisplay(succ.start);
      if (currentStart !== newStart || !updates.has(succ.id)) {
        updates.set(succ.id, { startDate: newStart, durationDays });
      }

      if (!enqueued.has(succ.id)) {
        queue.push(succ.id);
        enqueued.add(succ.id);
      }
    }
  }

  return updates;
}

export type MockKnowledgeItem = {
  id: string;
  kind: "note" | "doc" | "email" | "slack";
  title: string;
  excerpt: string;
  updated: string;
};

export const MOCK_PROJECTS: MockProject[] = [
  {
    id: "p-nest",
    name: "Nest Framework",
    slug: "nest",
    color: "#3b82f6",
    pinned: true,
    archived: false,
    percentComplete: 62,
    startDate: "2026-07-07",
    finish: "Jan 15, 2027",
    manager: "You",
  },
  {
    id: "p-swift",
    name: "Swift PM App",
    slug: "swift",
    color: "#8b5cf6",
    pinned: true,
    archived: false,
    percentComplete: 18,
    startDate: "2026-07-07",
    finish: "Oct 15, 2026",
    manager: "You",
  },
  {
    id: "p-loon",
    name: "Loon TV Client",
    slug: "loon",
    color: "#10b981",
    pinned: false,
    archived: false,
    percentComplete: 45,
    startDate: "2026-06-01",
    finish: "Sep 1, 2026",
    manager: "You",
  },
  {
    id: "p-kiwi",
    name: "Kiwi Migration",
    slug: "kiwi",
    color: "#f59e0b",
    pinned: false,
    archived: true,
    percentComplete: 100,
    startDate: "2025-01-01",
    finish: "Mar 2026",
    manager: "You",
  },
  {
    id: "p-garden",
    name: "Home Lab",
    slug: "homelab",
    color: "#64748b",
    pinned: false,
    archived: true,
    percentComplete: 80,
    startDate: "2025-06-01",
    finish: "Dec 2025",
    manager: "You",
  },
];

export const MOCK_TASKS: MockTask[] = [
  {
    id: "1",
    projectId: "p-nest",
    outlineLevel: 0,
    isSummary: true,
    isMilestone: false,
    name: "Swift desktop app",
    duration: "25 days",
    start: "Mon 7/7/26",
    finish: "Fri 8/8/26",
    predecessors: "",
    resources: "",
    percentComplete: 25,
    bar: { left: 2, width: 48 },
  },
  {
    id: "2",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "UI mockup (MS Project shell)",
    duration: "3 days",
    start: "Mon 7/7/26",
    finish: "Wed 7/9/26",
    predecessors: "",
    resources: "You",
    percentComplete: 100,
    notes: "Ribbon, Gantt, Project Center, status bar.",
    bar: { left: 2, width: 8 },
  },
  {
    id: "3",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "swift-data + Postgres",
    duration: "5 days",
    start: "Thu 7/10/26",
    finish: "Wed 7/16/26",
    predecessors: "2",
    resources: "You",
    percentComplete: 0,
    bar: { left: 12, width: 14 },
  },
  {
    id: "4",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: true,
    name: "Phase 2 gate",
    duration: "0 days",
    start: "Thu 7/17/26",
    finish: "Thu 7/17/26",
    predecessors: "3",
    resources: "",
    percentComplete: 0,
    bar: { left: 28, width: 1 },
  },
  {
    id: "5",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Gantt wiring + predecessors",
    duration: "8 days",
    start: "Fri 7/18/26",
    finish: "Tue 7/29/26",
    predecessors: "4",
    resources: "You",
    percentComplete: 0,
    bar: { left: 30, width: 22 },
  },
  {
    id: "6",
    projectId: "p-nest",
    outlineLevel: 0,
    isSummary: true,
    isMilestone: false,
    name: "Knowledge + agent",
    duration: "12 days",
    start: "Wed 7/23/26",
    finish: "Thu 8/7/26",
    predecessors: "3",
    resources: "",
    percentComplete: 0,
    bar: { left: 38, width: 28 },
  },
  {
    id: "7",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "pgvector ingest",
    duration: "4 days",
    start: "Wed 7/23/26",
    finish: "Mon 7/28/26",
    predecessors: "",
    resources: "You",
    percentComplete: 0,
    bar: { left: 38, width: 12 },
  },
  {
    id: "8",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Ollama agent panel",
    duration: "6 days",
    start: "Tue 7/29/26",
    finish: "Tue 8/5/26",
    predecessors: "7",
    resources: "You",
    percentComplete: 0,
    bar: { left: 52, width: 18 },
  },
  {
    id: "9",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Task form + modals",
    duration: "4 days",
    start: "Wed 8/6/26",
    finish: "Mon 8/11/26",
    predecessors: "5",
    resources: "You",
    percentComplete: 50,
    bar: { left: 54, width: 12 },
  },
  {
    id: "10",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Toast + confirm dialogs",
    duration: "2 days",
    start: "Tue 8/12/26",
    finish: "Wed 8/13/26",
    predecessors: "9",
    resources: "You",
    percentComplete: 100,
    bar: { left: 58, width: 6 },
  },
  {
    id: "11",
    projectId: "p-nest",
    outlineLevel: 0,
    isSummary: true,
    isMilestone: false,
    name: "nest-data-postgres",
    duration: "35 days",
    start: "Mon 8/11/26",
    finish: "Fri 9/26/26",
    predecessors: "4",
    resources: "",
    percentComplete: 10,
    bar: { left: 20, width: 42 },
  },
  {
    id: "12",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Migrations 001–003",
    duration: "6 days",
    start: "Mon 8/11/26",
    finish: "Mon 8/18/26",
    predecessors: "",
    resources: "You",
    percentComplete: 0,
    bar: { left: 20, width: 14 },
  },
  {
    id: "13",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "ProjectRepository",
    duration: "5 days",
    start: "Tue 8/19/26",
    finish: "Mon 8/25/26",
    predecessors: "12",
    resources: "You",
    percentComplete: 0,
    bar: { left: 26, width: 12 },
  },
  {
    id: "14",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "TaskRepository + links",
    duration: "7 days",
    start: "Tue 8/26/26",
    finish: "Wed 9/3/26",
    predecessors: "13",
    resources: "You",
    percentComplete: 0,
    bar: { left: 32, width: 16 },
  },
  {
    id: "15",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: true,
    name: "DB schema freeze",
    duration: "0 days",
    start: "Thu 9/4/26",
    finish: "Thu 9/4/26",
    predecessors: "14",
    resources: "",
    percentComplete: 0,
    bar: { left: 40, width: 1 },
  },
  {
    id: "16",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Tauri command wiring",
    duration: "8 days",
    start: "Fri 9/5/26",
    finish: "Tue 9/16/26",
    predecessors: "15",
    resources: "You",
    percentComplete: 0,
    bar: { left: 42, width: 18 },
  },
  {
    id: "17",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "pgvector extension + seed",
    duration: "6 days",
    start: "Wed 9/17/26",
    finish: "Wed 9/24/26",
    predecessors: "16",
    resources: "You",
    percentComplete: 0,
    bar: { left: 48, width: 14 },
  },
  {
    id: "18",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Connection pool tuning",
    duration: "4 days",
    start: "Thu 9/25/26",
    finish: "Tue 9/30/26",
    predecessors: "17",
    resources: "You",
    percentComplete: 0,
    bar: { left: 54, width: 10 },
  },
  {
    id: "19",
    projectId: "p-nest",
    outlineLevel: 0,
    isSummary: true,
    isMilestone: false,
    name: "Knowledge pipeline",
    duration: "28 days",
    start: "Mon 9/8/26",
    finish: "Mon 10/6/26",
    predecessors: "15",
    resources: "",
    percentComplete: 0,
    bar: { left: 36, width: 34 },
  },
  {
    id: "20",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Ingest email + Slack",
    duration: "5 days",
    start: "Mon 9/8/26",
    finish: "Fri 9/12/26",
    predecessors: "",
    resources: "You",
    percentComplete: 0,
    bar: { left: 36, width: 12 },
  },
  {
    id: "21",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Embedding batch job",
    duration: "6 days",
    start: "Mon 9/15/26",
    finish: "Mon 9/22/26",
    predecessors: "20",
    resources: "You",
    percentComplete: 0,
    bar: { left: 42, width: 14 },
  },
  {
    id: "22",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "swift_search_knowledge tool",
    duration: "7 days",
    start: "Tue 9/23/26",
    finish: "Wed 10/1/26",
    predecessors: "21",
    resources: "You",
    percentComplete: 0,
    bar: { left: 48, width: 16 },
  },
  {
    id: "23",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Knowledge UI filters",
    duration: "4 days",
    start: "Thu 10/2/26",
    finish: "Tue 10/7/26",
    predecessors: "22",
    resources: "You",
    percentComplete: 0,
    bar: { left: 54, width: 10 },
  },
  {
    id: "24",
    projectId: "p-nest",
    outlineLevel: 0,
    isSummary: true,
    isMilestone: false,
    name: "Polish + performance",
    duration: "30 days",
    start: "Mon 10/6/26",
    finish: "Fri 11/14/26",
    predecessors: "18",
    resources: "",
    percentComplete: 0,
    bar: { left: 58, width: 36 },
  },
  {
    id: "25",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Virtualized task grid",
    duration: "6 days",
    start: "Mon 10/6/26",
    finish: "Mon 10/13/26",
    predecessors: "",
    resources: "You",
    percentComplete: 0,
    bar: { left: 58, width: 14 },
  },
  {
    id: "26",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Synced Gantt scroll",
    duration: "3 days",
    start: "Tue 10/14/26",
    finish: "Thu 10/16/26",
    predecessors: "25",
    resources: "You",
    percentComplete: 0,
    notes: "Horizontal week columns + sticky headers.",
    bar: { left: 64, width: 8 },
  },
  {
    id: "27",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Keyboard shortcuts",
    duration: "4 days",
    start: "Fri 10/17/26",
    finish: "Wed 10/22/26",
    predecessors: "26",
    resources: "You",
    percentComplete: 0,
    bar: { left: 68, width: 10 },
  },
  {
    id: "28",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Theme + CBRE tokens audit",
    duration: "3 days",
    start: "Thu 10/23/26",
    finish: "Mon 10/27/26",
    predecessors: "27",
    resources: "You",
    percentComplete: 0,
    bar: { left: 72, width: 8 },
  },
  {
    id: "29",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Agent panel streaming",
    duration: "8 days",
    start: "Tue 10/28/26",
    finish: "Thu 11/6/26",
    predecessors: "28",
    resources: "You",
    percentComplete: 0,
    bar: { left: 76, width: 18 },
  },
  {
    id: "30",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: true,
    name: "Beta milestone",
    duration: "0 days",
    start: "Fri 11/7/26",
    finish: "Fri 11/7/26",
    predecessors: "29",
    resources: "",
    percentComplete: 0,
    bar: { left: 82, width: 1 },
  },
  {
    id: "31",
    projectId: "p-nest",
    outlineLevel: 0,
    isSummary: true,
    isMilestone: false,
    name: "QA + hardening",
    duration: "25 days",
    start: "Mon 11/10/26",
    finish: "Fri 12/12/26",
    predecessors: "30",
    resources: "",
    percentComplete: 0,
    bar: { left: 70, width: 30 },
  },
  {
    id: "32",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Manual test checklist",
    duration: "5 days",
    start: "Mon 11/10/26",
    finish: "Fri 11/14/26",
    predecessors: "",
    resources: "You",
    percentComplete: 0,
    bar: { left: 70, width: 12 },
  },
  {
    id: "33",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Portfolio stress test",
    duration: "4 days",
    start: "Mon 11/17/26",
    finish: "Thu 11/20/26",
    predecessors: "32",
    resources: "You",
    percentComplete: 0,
    bar: { left: 76, width: 10 },
  },
  {
    id: "34",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Remote Postgres failover drill",
    duration: "3 days",
    start: "Fri 11/21/26",
    finish: "Tue 11/25/26",
    predecessors: "33",
    resources: "You",
    percentComplete: 0,
    bar: { left: 80, width: 8 },
  },
  {
    id: "35",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Bug bash",
    duration: "5 days",
    start: "Wed 11/26/26",
    finish: "Tue 12/2/26",
    predecessors: "34",
    resources: "You",
    percentComplete: 0,
    bar: { left: 84, width: 12 },
  },
  {
    id: "36",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Release notes",
    duration: "3 days",
    start: "Wed 12/3/26",
    finish: "Fri 12/5/26",
    predecessors: "35",
    resources: "You",
    percentComplete: 0,
    bar: { left: 88, width: 8 },
  },
  {
    id: "37",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: true,
    name: "v1.0 release",
    duration: "0 days",
    start: "Fri 12/12/26",
    finish: "Fri 12/12/26",
    predecessors: "36",
    resources: "",
    percentComplete: 0,
    bar: { left: 92, width: 1 },
  },
  {
    id: "38",
    projectId: "p-nest",
    outlineLevel: 0,
    isSummary: true,
    isMilestone: false,
    name: "Post-launch",
    duration: "20 days",
    start: "Mon 12/15/26",
    finish: "Fri 1/9/27",
    predecessors: "37",
    resources: "",
    percentComplete: 0,
    bar: { left: 82, width: 24 },
  },
  {
    id: "39",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Template feedback doc",
    duration: "4 days",
    start: "Mon 12/15/26",
    finish: "Thu 12/18/26",
    predecessors: "",
    resources: "You",
    percentComplete: 0,
    bar: { left: 82, width: 10 },
  },
  {
    id: "40",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Promote AppShell to template",
    duration: "6 days",
    start: "Fri 12/19/26",
    finish: "Fri 12/26/26",
    predecessors: "39",
    resources: "You",
    percentComplete: 0,
    bar: { left: 86, width: 14 },
  },
  {
    id: "41",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: false,
    name: "Dogfood on second project",
    duration: "5 days",
    start: "Mon 12/29/26",
    finish: "Fri 1/2/27",
    predecessors: "40",
    resources: "You",
    percentComplete: 0,
    bar: { left: 90, width: 12 },
  },
  {
    id: "42",
    projectId: "p-nest",
    outlineLevel: 1,
    isSummary: false,
    isMilestone: true,
    name: "Retrospective",
    duration: "0 days",
    start: "Fri 1/9/27",
    finish: "Fri 1/9/27",
    predecessors: "41",
    resources: "",
    percentComplete: 0,
    bar: { left: 96, width: 1 },
  },
];

export const MOCK_KNOWLEDGE: MockKnowledgeItem[] = [
  {
    id: "k1",
    kind: "doc",
    title: "swift-data-v1 plan",
    excerpt: "PostgreSQL migrations, ProjectRepository, TaskRepository…",
    updated: "Today",
  },
  {
    id: "k2",
    kind: "note",
    title: "MS Project UX notes",
    excerpt: "Ribbon tabs, Gantt default, Project Center for portfolio…",
    updated: "Today",
  },
  {
    id: "k3",
    kind: "doc",
    title: "nest-data-postgres README",
    excerpt: "sqlx pool, pgvector extension, migration runner.",
    updated: "Yesterday",
  },
  {
    id: "k4",
    kind: "slack",
    title: "#nest — server.lan Postgres",
    excerpt: "Remote DB + Ollama on same host; embeddings nomic-embed-text.",
    updated: "Mon",
  },
];

export const TIMESCALE_WEEKS = [
  "Jul 6",
  "Jul 13",
  "Jul 20",
  "Jul 27",
  "Aug 3",
  "Aug 10",
  "Aug 17",
  "Aug 24",
  "Aug 31",
  "Sep 7",
  "Sep 14",
  "Sep 21",
  "Sep 28",
  "Oct 5",
  "Oct 12",
  "Oct 19",
  "Oct 26",
  "Nov 2",
  "Nov 9",
  "Nov 16",
  "Nov 23",
  "Nov 30",
  "Dec 7",
  "Dec 14",
  "Dec 21",
  "Dec 28",
  "Jan 4",
  "Jan 11",
];

/** Fixed pixel width per week column — drives horizontal Gantt scroll. */
export const GANTT_WEEK_WIDTH_PX = 72;

/** Minimum week column width when fitting the chart to the viewport. */
export const GANTT_FIT_MIN_WEEK_WIDTH_PX = 32;

export function ganttChartWidthPx(weekWidthPx = GANTT_WEEK_WIDTH_PX): number {
  return TIMESCALE_WEEKS.length * weekWidthPx;
}

export function ganttWeekWidthForViewport(
  viewportWidth: number,
  minWeekWidthPx = GANTT_FIT_MIN_WEEK_WIDTH_PX,
): number {
  if (viewportWidth <= 0) {
    return GANTT_WEEK_WIDTH_PX;
  }
  return Math.max(minWeekWidthPx, viewportWidth / TIMESCALE_WEEKS.length);
}

/** ISO date of the first Gantt timescale column (`Jul 6`). */
export const TIMELINE_START_ISO = "2026-07-06";

/** Total days spanned by the timescale header (weeks × 7). */
export const TIMELINE_TOTAL_DAYS = TIMESCALE_WEEKS.length * 7;

/**
 * Positions a Gantt bar as a percentage of the timescale width, derived from a
 * task's real start/finish dates so bars line up with the date header columns.
 *
 * `left` = days from `TIMELINE_START_ISO` to the start, over the total span.
 * `width` = task duration over the total span (0 for milestones, which render
 * as a diamond at `left`).
 */
export function ganttBarForDates(
  startIso: string | null,
  finishIso: string | null,
  isMilestone: boolean,
  durationDays?: number,
): { left: number; width: number } {
  const round = (value: number) => Math.round(value * 100) / 100;
  if (!startIso) {
    return { left: 2, width: isMilestone ? 0 : 8 };
  }
  const offset = calendarDaysBetween(TIMELINE_START_ISO, startIso);
  const left = Math.min(98, Math.max(0, (offset / TIMELINE_TOTAL_DAYS) * 100));
  if (isMilestone) {
    return { left: round(left), width: 0 };
  }
  const days =
    durationDays && durationDays > 0
      ? durationDays
      : finishIso
        ? durationDaysFromRange(startIso, finishIso)
        : 1;
  const minWidth = (1 / TIMELINE_TOTAL_DAYS) * 100;
  const width = Math.min(
    100 - left,
    Math.max(minWidth, (days / TIMELINE_TOTAL_DAYS) * 100),
  );
  return { left: round(left), width: round(width) };
}

/** Distinct bar hues per top-level summary group (MS Project–style). */
export const TASK_BAR_COLORS = [
  "#003f2d",
  "#006a4d",
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#e11d48",
  "#64748b",
] as const;

export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return hex;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Maps each task to the color of its summary group. */
export function buildTaskBarColorMap(tasks: MockTask[]): Map<string, string> {
  const map = new Map<string, string>();
  const levelColors: (string | undefined)[] = [];
  let paletteIndex = 0;

  for (const task of tasks) {
    if (task.isSummary) {
      const color = TASK_BAR_COLORS[paletteIndex % TASK_BAR_COLORS.length];
      paletteIndex += 1;
      levelColors[task.outlineLevel] = color;
      map.set(task.id, color);
      continue;
    }

    let color: string = TASK_BAR_COLORS[0];
    for (let level = task.outlineLevel - 1; level >= 0; level -= 1) {
      const parentColor = levelColors[level];
      if (parentColor) {
        color = parentColor;
        break;
      }
    }
    map.set(task.id, color);
  }

  return map;
}

export const CALENDAR_WEEKS = [
  { label: "Week of Jul 7", days: ["Mon 7", "Tue 8", "Wed 9", "Thu 10", "Fri 11"] },
  { label: "Week of Jul 14", days: ["Mon 14", "Tue 15", "Wed 16", "Thu 17", "Fri 18"] },
];

export function tasksForProject(
  projectId: string,
  tasksByProject?: Record<string, MockTask[]>,
): MockTask[] {
  if (tasksByProject) {
    return tasksByProject[projectId] ?? [];
  }
  return buildInitialTasksByProject()[projectId] ?? [];
}
