import { invoke } from "@tauri-apps/api/core";

import { isTauri } from "./tauri";

/**
 * Typed client for the Swift Tauri plugin (`plugin:swift|*` commands).
 *
 * Field names match the Rust `swift-data` entities (snake_case) as serialized
 * over IPC. Use the adapters in `swiftAdapters.ts` to convert these into the
 * UI's display shapes.
 */

export type DbProject = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  manager: string | null;
  archived: boolean;
  pinned: boolean;
  percent_complete: number;
  start_date: string | null;
  finish_date: string | null;
  status_date: string | null;
  priority: string;
  calendar_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DbTask = {
  id: string;
  project_id: string;
  parent_id: string | null;
  outline_level: number;
  is_summary: boolean;
  is_milestone: boolean;
  title: string;
  notes: string | null;
  duration_days: number;
  duration_minutes: number | null;
  start_date: string | null;
  finish_date: string | null;
  percent_complete: number;
  resource_names: string;
  priority: string | null;
  constraint_type: string | null;
  constraint_date: string | null;
  deadline: string | null;
  effort_driven: boolean;
  task_type: string | null;
  sort_order: number;
  actual_start: string | null;
  actual_finish: string | null;
  created_at: string;
  updated_at: string;
};

export type DbTaskLink = {
  id: string;
  project_id: string;
  predecessor_id: string;
  successor_id: string;
  link_type: string;
  lag_minutes: number;
  created_at: string;
};

export type DbKnowledgeCategory = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DbKnowledgeArticle = {
  id: string;
  project_id: string;
  category_id: string;
  title: string;
  body: string;
  source_type: string;
  source_label: string;
  source_uri: string | null;
  created_at: string;
  updated_at: string;
  indexed_at: string | null;
};

export type DbKnowledgeRevision = {
  id: string;
  article_id: string;
  revision_number: number;
  title: string;
  body: string;
  change_note: string | null;
  created_by: string;
  created_at: string;
};

export type DbAppSetting = {
  key: string;
  value_json: unknown;
};

export type DbProjectFile = {
  id: string;
  project_id: string;
  title: string;
  file_name: string;
  file_type: string;
  description: string | null;
  size_bytes: number;
  stored_path: string;
  created_at: string;
  updated_at: string;
};

/** A file the user picked in the native dialog (not yet attached). */
export type PickedFile = {
  path: string;
  file_name: string;
  file_type: string;
  size_bytes: number;
};

/** True when the Swift data plugin is reachable (i.e. running under Tauri). */
export function hasSwiftData(): boolean {
  return isTauri();
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(`plugin:swift|${command}`, args);
}

export function listProjects(): Promise<DbProject[]> {
  return call<DbProject[]>("swift_list_projects");
}

export function listTasks(projectId: string): Promise<DbTask[]> {
  return call<DbTask[]>("swift_list_tasks", { projectId });
}

export function listTaskLinks(projectId: string): Promise<DbTaskLink[]> {
  return call<DbTaskLink[]>("swift_list_task_links", { projectId });
}

export function listKnowledgeCategories(
  projectId: string,
): Promise<DbKnowledgeCategory[]> {
  return call<DbKnowledgeCategory[]>("swift_list_knowledge_categories", { projectId });
}

export function listKnowledgeArticles(
  projectId: string,
): Promise<DbKnowledgeArticle[]> {
  return call<DbKnowledgeArticle[]>("swift_list_knowledge_articles", { projectId });
}

export function listKnowledgeRevisions(
  articleId: string,
): Promise<DbKnowledgeRevision[]> {
  return call<DbKnowledgeRevision[]>("swift_list_knowledge_revisions", { articleId });
}

export function searchKnowledge(
  query: string,
  projectId?: string,
  limit?: number,
): Promise<DbKnowledgeArticle[]> {
  return call<DbKnowledgeArticle[]>("swift_search_knowledge", {
    query,
    projectId: projectId ?? null,
    limit: limit ?? null,
  });
}

export function listSettings(): Promise<DbAppSetting[]> {
  return call<DbAppSetting[]>("swift_list_settings");
}

// --- Writes ---------------------------------------------------------------

export function createProject(project: DbProject): Promise<DbProject> {
  return call<DbProject>("swift_create_project", { project });
}

export function updateProject(project: DbProject): Promise<DbProject> {
  return call<DbProject>("swift_update_project", { project });
}

/** Archives a project and completes all its tasks; returns the updated row. */
export function archiveProject(id: string): Promise<DbProject> {
  return call<DbProject>("swift_archive_project", { id });
}

export function deleteProject(id: string): Promise<void> {
  return call<void>("swift_delete_project", { id });
}

export function createTask(task: DbTask): Promise<DbTask> {
  return call<DbTask>("swift_create_task", { task });
}

export function updateTask(task: DbTask): Promise<DbTask> {
  return call<DbTask>("swift_update_task", { task });
}

export function deleteTask(id: string): Promise<void> {
  return call<void>("swift_delete_task", { id });
}

export function setTaskPredecessors(
  projectId: string,
  successorId: string,
  predecessorIds: string[],
): Promise<DbTaskLink[]> {
  return call<DbTaskLink[]>("swift_set_task_predecessors", {
    projectId,
    successorId,
    predecessorIds,
  });
}

export function createKnowledgeCategory(
  category: DbKnowledgeCategory,
): Promise<DbKnowledgeCategory> {
  return call<DbKnowledgeCategory>("swift_create_knowledge_category", { category });
}

export function deleteKnowledgeCategory(id: string): Promise<void> {
  return call<void>("swift_delete_knowledge_category", { id });
}

export function createKnowledgeArticle(
  article: DbKnowledgeArticle,
): Promise<DbKnowledgeArticle> {
  return call<DbKnowledgeArticle>("swift_create_knowledge_article", { article });
}

export function updateKnowledgeArticle(
  article: DbKnowledgeArticle,
): Promise<DbKnowledgeArticle> {
  return call<DbKnowledgeArticle>("swift_update_knowledge_article", { article });
}

export function deleteKnowledgeArticle(id: string): Promise<void> {
  return call<void>("swift_delete_knowledge_article", { id });
}

export function addKnowledgeRevision(
  revision: DbKnowledgeRevision,
): Promise<DbKnowledgeRevision> {
  return call<DbKnowledgeRevision>("swift_add_knowledge_revision", { revision });
}

export function setSetting(key: string, value: unknown): Promise<void> {
  return call<void>("swift_set_setting", { key, value });
}

// --- Project files --------------------------------------------------------

export function listProjectFiles(projectId: string): Promise<DbProjectFile[]> {
  return call<DbProjectFile[]>("swift_list_project_files", { projectId });
}

/** Opens a native file picker; resolves to `null` if the user cancels. */
export function pickFile(): Promise<PickedFile | null> {
  return call<PickedFile | null>("swift_pick_file");
}

/** Opens a native folder picker; resolves to `null` if the user cancels. */
export function pickFolder(): Promise<string | null> {
  return call<string | null>("swift_pick_folder");
}

export function addProjectFile(
  projectId: string,
  sourcePath: string,
  title: string,
  description: string | null,
): Promise<DbProjectFile> {
  return call<DbProjectFile>("swift_add_project_file", {
    projectId,
    sourcePath,
    title,
    description,
  });
}

export function deleteProjectFile(id: string): Promise<void> {
  return call<void>("swift_delete_project_file", { id });
}

/** Launches the file with the OS default application. */
export function openProjectFile(id: string): Promise<void> {
  return call<void>("swift_open_project_file", { id });
}

// --- Diagnostics ----------------------------------------------------------

/**
 * Toggles backend IPC command logging. When enabled, every `plugin:swift|*`
 * command logs its args + output to the app log file (`apps/swift/logs/swift`).
 */
export function setDebugLogging(enabled: boolean): Promise<void> {
  return call<void>("swift_set_debug_logging", { enabled });
}

/** Returns whether backend IPC command logging is currently enabled. */
export function getDebugLogging(): Promise<boolean> {
  return call<boolean>("swift_get_debug_logging");
}
