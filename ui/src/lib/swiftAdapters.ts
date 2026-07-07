import {
  formatProjectDate,
  formatTaskDate,
  formatTaskDuration,
  ganttBarForDates,
  parseProjectDateDisplay,
  parseTaskDateDisplay,
  parseTaskDuration,
  type MockProject,
  type MockTask,
  type NewProjectInput,
  type NewTaskInput,
} from "../mock/demo";
import {
  type KnowledgeSourceType,
  type MockKnowledgeArticle,
  type MockKnowledgeCategory,
  type MockKnowledgeRevision,
  type NewKnowledgeArticleInput,
  type NewKnowledgeCategoryInput,
} from "../mock/knowledgeDemo";
import { type MockProjectFile } from "../mock/filesDemo";
import type {
  DbKnowledgeArticle,
  DbKnowledgeCategory,
  DbKnowledgeRevision,
  DbProject,
  DbProjectFile,
  DbTask,
  DbTaskLink,
} from "./swift";

export function dbProjectToMock(p: DbProject): MockProject {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description ?? undefined,
    color: p.color,
    pinned: p.pinned,
    archived: p.archived,
    percentComplete: p.percent_complete,
    startDate: p.start_date ?? "",
    finish: p.finish_date ? formatProjectDate(p.finish_date) : "—",
    manager: p.manager ?? "You",
  };
}

export function dbProjectsToMock(projects: DbProject[]): MockProject[] {
  return projects.map(dbProjectToMock);
}

/** Reconstructs a DB project from a display project (for updates). */
export function mockProjectToDb(project: MockProject, sortOrder: number): DbProject {
  const now = nowIso();
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    description: project.description ?? null,
    color: project.color,
    icon: null,
    manager: project.manager || null,
    archived: project.archived,
    pinned: project.pinned,
    percent_complete: project.percentComplete,
    start_date: project.startDate || null,
    finish_date: parseProjectDateDisplay(project.finish),
    status_date: null,
    priority: "Normal",
    calendar_id: null,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Converts DB tasks + links into display tasks. Predecessors are rendered as
 * 1-based row numbers (MS Project style), derived from the link graph.
 */
export function dbTasksToMock(tasks: DbTask[], links: DbTaskLink[]): MockTask[] {
  const rowById = new Map<string, number>();
  tasks.forEach((task, index) => rowById.set(task.id, index + 1));

  const predecessorsBySuccessor = new Map<string, number[]>();
  for (const link of links) {
    const row = rowById.get(link.predecessor_id);
    if (row === undefined) {
      continue;
    }
    const list = predecessorsBySuccessor.get(link.successor_id) ?? [];
    list.push(row);
    predecessorsBySuccessor.set(link.successor_id, list);
  }

  return tasks.map((task) => {
    const predecessors = (predecessorsBySuccessor.get(task.id) ?? [])
      .sort((a, b) => a - b)
      .join(",");
    return {
      id: task.id,
      projectId: task.project_id,
      outlineLevel: task.outline_level,
      isSummary: task.is_summary,
      isMilestone: task.is_milestone,
      name: task.title,
      duration: formatTaskDuration(task.duration_days, task.is_milestone),
      start: formatTaskDate(task.start_date ?? ""),
      finish: formatTaskDate(task.finish_date ?? ""),
      predecessors,
      resources: task.resource_names,
      percentComplete: task.percent_complete,
      notes: task.notes ?? undefined,
      priority: task.priority ?? undefined,
      constraintType: task.constraint_type ?? undefined,
      constraintDate: task.constraint_date ?? undefined,
      deadline: task.deadline ?? undefined,
      effortDriven: task.effort_driven,
      taskType: task.task_type ?? undefined,
      bar: ganttBarForDates(
        task.start_date,
        task.finish_date,
        task.is_milestone,
        task.duration_days,
      ),
    };
  });
}

export function dbFileToMock(f: DbProjectFile): MockProjectFile {
  return {
    id: f.id,
    projectId: f.project_id,
    title: f.title,
    fileName: f.file_name,
    fileType: f.file_type,
    description: f.description ?? undefined,
    sizeBytes: f.size_bytes,
    addedAt: f.created_at,
  };
}

export function dbFilesToMock(files: DbProjectFile[]): MockProjectFile[] {
  return files.map(dbFileToMock);
}

export function dbCategoryToMock(c: DbKnowledgeCategory): MockKnowledgeCategory {
  return {
    id: c.id,
    projectId: c.project_id,
    name: c.name,
    description: c.description ?? undefined,
    sortOrder: c.sort_order,
  };
}

export function dbRevisionToMock(r: DbKnowledgeRevision): MockKnowledgeRevision {
  return {
    id: r.id,
    revisionNumber: r.revision_number,
    title: r.title,
    body: r.body,
    createdAt: r.created_at.slice(0, 10),
    createdBy: r.created_by,
    changeNote: r.change_note ?? undefined,
  };
}

export function dbArticleToMock(
  a: DbKnowledgeArticle,
  revisions: DbKnowledgeRevision[] = [],
): MockKnowledgeArticle {
  return {
    id: a.id,
    projectId: a.project_id,
    categoryId: a.category_id,
    title: a.title,
    body: a.body,
    sourceType: a.source_type as KnowledgeSourceType,
    sourceLabel: a.source_label,
    sourceUri: a.source_uri ?? undefined,
    createdAt: a.created_at.slice(0, 10),
    updatedAt: a.updated_at.slice(0, 10),
    indexedAt: a.indexed_at ? a.indexed_at.slice(0, 10) : undefined,
    revisions: revisions.map(dbRevisionToMock),
  };
}

// --- UI → DB (writes) -----------------------------------------------------
//
// Timestamps (created_at/updated_at) are placeholders — the repositories set
// them server-side (RFC3339 required by chrono deserialization). Ids should be
// real UUIDs (crypto.randomUUID) so local state and the DB row match.

function nowIso(): string {
  return new Date().toISOString();
}

export function newProjectToDb(id: string, input: NewProjectInput): DbProject {
  const now = nowIso();
  return {
    id,
    slug: input.slug.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    color: input.color,
    icon: null,
    manager: input.manager.trim() || "You",
    archived: false,
    pinned: input.pinned,
    percent_complete: 0,
    start_date: input.startDate || null,
    finish_date: input.finishDate || null,
    status_date: null,
    priority: "Normal",
    calendar_id: null,
    sort_order: 0,
    created_at: now,
    updated_at: now,
  };
}

export function newTaskToDb(
  id: string,
  projectId: string,
  input: NewTaskInput,
  sortOrder: number,
): DbTask {
  const now = nowIso();
  return {
    id,
    project_id: projectId,
    parent_id: null,
    outline_level: input.outlineLevel,
    is_summary: input.isSummary,
    is_milestone: input.isMilestone,
    title: input.name.trim(),
    notes: input.notes?.trim() || null,
    duration_days: input.isMilestone ? 0 : input.durationDays,
    duration_minutes: null,
    start_date: input.startDate || null,
    finish_date: input.finishDate || null,
    percent_complete: input.percentComplete,
    resource_names: input.resources.trim(),
    priority: null,
    constraint_type: null,
    constraint_date: null,
    deadline: null,
    effort_driven: false,
    task_type: null,
    sort_order: sortOrder,
    actual_start: null,
    actual_finish: null,
    created_at: now,
    updated_at: now,
  };
}

/** Reconstructs a DB task from a display task (for updates). */
export function mockTaskToDb(
  task: MockTask,
  projectId: string,
  sortOrder: number,
): DbTask {
  const now = nowIso();
  return {
    id: task.id,
    project_id: projectId,
    parent_id: null,
    outline_level: task.outlineLevel,
    is_summary: task.isSummary,
    is_milestone: task.isMilestone,
    title: task.name,
    notes: task.notes ?? null,
    duration_days: task.isMilestone ? 0 : parseTaskDuration(task.duration),
    duration_minutes: null,
    start_date: parseTaskDateDisplay(task.start),
    finish_date: parseTaskDateDisplay(task.finish),
    percent_complete: task.percentComplete,
    resource_names: task.resources,
    priority: task.priority ?? null,
    constraint_type: task.constraintType ?? null,
    constraint_date: task.constraintDate ?? null,
    deadline: task.deadline ?? null,
    effort_driven: task.effortDriven ?? false,
    task_type: task.taskType ?? null,
    sort_order: sortOrder,
    actual_start: null,
    actual_finish: null,
    created_at: now,
    updated_at: now,
  };
}

export function newCategoryToDb(
  id: string,
  projectId: string,
  input: NewKnowledgeCategoryInput,
  sortOrder: number,
): DbKnowledgeCategory {
  const now = nowIso();
  return {
    id,
    project_id: projectId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  };
}

export function newArticleToDb(
  id: string,
  projectId: string,
  input: NewKnowledgeArticleInput,
): DbKnowledgeArticle {
  const now = nowIso();
  return {
    id,
    project_id: projectId,
    category_id: input.categoryId,
    title: input.title.trim(),
    body: input.body.trim(),
    source_type: input.sourceType,
    source_label: input.sourceLabel.trim(),
    source_uri: input.sourceUri?.trim() || null,
    created_at: now,
    updated_at: now,
    indexed_at: null,
  };
}

export function newRevisionToDb(
  id: string,
  articleId: string,
  title: string,
  body: string,
  createdBy: string,
  changeNote?: string,
): DbKnowledgeRevision {
  return {
    id,
    article_id: articleId,
    revision_number: 1,
    title: title.trim(),
    body: body.trim(),
    change_note: changeNote ?? null,
    created_by: createdBy,
    created_at: nowIso(),
  };
}
