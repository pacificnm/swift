//! Swift IPC commands exposing `swift-data` repositories to the React UI.
//!
//! Every command reads through [`SwiftData`], which connects lazily on Tauri's
//! runtime. Entities are returned as-is; the UI maps them to display shapes.

use std::path::{Path, PathBuf};

use nest_tauri::NestHostState;
use serde::Serialize;
use serde_json::Value;
use tauri::State;
use uuid::Uuid;

use swift_data::{
    AppSetting, AsyncRepository, KnowledgeArticle, KnowledgeCategory, KnowledgeRevision, Project,
    ProjectFile, Task, TaskLink,
};

use crate::data::SwiftData;

/// Wraps a command body with optional IPC logging.
///
/// When debug logging is enabled (see [`SwiftData::set_debug_logging`]) the
/// command name + serialized args are logged before execution, and the ok
/// output or error string is logged after. `$args` should be a serializable
/// snapshot of the inputs (`serde_json::json!({})` when there are none).
macro_rules! ipc {
    ($data:expr, $cmd:literal, $args:expr, $body:expr) => {{
        $data.log_call($cmd, &$args);
        $data.log_result($cmd, $body.await)
    }};
}

/// Builds the `swift` Tauri plugin carrying all Swift IPC commands.
///
/// Commands are invoked from the UI as `plugin:swift|<command>`.
pub fn swift_plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("swift")
        .invoke_handler(tauri::generate_handler![
            swift_list_projects,
            swift_list_tasks,
            swift_list_task_links,
            swift_list_knowledge_categories,
            swift_list_knowledge_articles,
            swift_list_knowledge_revisions,
            swift_search_knowledge,
            swift_list_settings,
            swift_create_project,
            swift_update_project,
            swift_archive_project,
            swift_delete_project,
            swift_create_task,
            swift_update_task,
            swift_delete_task,
            swift_set_task_predecessors,
            swift_create_knowledge_category,
            swift_delete_knowledge_category,
            swift_create_knowledge_article,
            swift_update_knowledge_article,
            swift_delete_knowledge_article,
            swift_add_knowledge_revision,
            swift_set_setting,
            swift_list_project_files,
            swift_pick_file,
            swift_pick_folder,
            swift_add_project_file,
            swift_delete_project_file,
            swift_open_project_file,
            swift_set_debug_logging,
            swift_get_debug_logging,
        ])
        .build()
}

// --- Diagnostics --------------------------------------------------------

/// Toggles IPC command logging to the app log file (`logs/swift`).
///
/// Always logs the toggle itself so the transition is visible in the file.
#[tauri::command]
pub async fn swift_set_debug_logging(
    data: State<'_, SwiftData>,
    enabled: bool,
) -> Result<(), String> {
    data.set_debug_logging(enabled);
    tracing::info!(target: "swift::ipc", enabled, "ipc command logging toggled");
    Ok(())
}

/// Returns whether IPC command logging is currently enabled.
#[tauri::command]
pub async fn swift_get_debug_logging(data: State<'_, SwiftData>) -> Result<bool, String> {
    Ok(data.debug_logging())
}

/// Lists projects ordered for the Project Center.
#[tauri::command]
pub async fn swift_list_projects(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
) -> Result<Vec<Project>, String> {
    ipc!(data, "swift_list_projects", serde_json::json!({}), async {
        data.projects(&host)
            .await?
            .list_library()
            .await
            .map_err(|e| e.to_string())
    })
}

/// Lists tasks for a project in grid/Gantt order.
#[tauri::command]
pub async fn swift_list_tasks(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    project_id: Uuid,
) -> Result<Vec<Task>, String> {
    ipc!(data, "swift_list_tasks", serde_json::json!({ "project_id": project_id }), async {
        data.tasks(&host)
            .await?
            .list_by_project(project_id)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Lists dependency links for a project.
#[tauri::command]
pub async fn swift_list_task_links(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    project_id: Uuid,
) -> Result<Vec<TaskLink>, String> {
    ipc!(data, "swift_list_task_links", serde_json::json!({ "project_id": project_id }), async {
        data.task_links(&host)
            .await?
            .list_by_project(project_id)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Lists knowledge categories for a project.
#[tauri::command]
pub async fn swift_list_knowledge_categories(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    project_id: Uuid,
) -> Result<Vec<KnowledgeCategory>, String> {
    ipc!(data, "swift_list_knowledge_categories", serde_json::json!({ "project_id": project_id }), async {
        data.knowledge_categories(&host)
            .await?
            .list_by_project(project_id)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Lists knowledge articles for a project (most recently updated first).
#[tauri::command]
pub async fn swift_list_knowledge_articles(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    project_id: Uuid,
) -> Result<Vec<KnowledgeArticle>, String> {
    ipc!(data, "swift_list_knowledge_articles", serde_json::json!({ "project_id": project_id }), async {
        data.knowledge_articles(&host)
            .await?
            .list_by_project(project_id)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Lists revisions for an article (newest first).
#[tauri::command]
pub async fn swift_list_knowledge_revisions(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    article_id: Uuid,
) -> Result<Vec<KnowledgeRevision>, String> {
    ipc!(data, "swift_list_knowledge_revisions", serde_json::json!({ "article_id": article_id }), async {
        data.knowledge_revisions(&host)
            .await?
            .list_by_article(article_id)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Keyword (tsvector) search over article title + body.
///
/// Vector search requires populated embeddings (follow-up); this returns the
/// keyword ranking so the Knowledge tab has real results today.
#[tauri::command]
pub async fn swift_search_knowledge(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    query: String,
    project_id: Option<Uuid>,
    limit: Option<u32>,
) -> Result<Vec<KnowledgeArticle>, String> {
    ipc!(
        data,
        "swift_search_knowledge",
        serde_json::json!({ "query": query, "project_id": project_id, "limit": limit }),
        async {
            data.knowledge_articles(&host)
                .await?
                .keyword_search(&query, limit.unwrap_or(20), project_id)
                .await
                .map_err(|e| e.to_string())
        }
    )
}

/// Returns all settings sections.
#[tauri::command]
pub async fn swift_list_settings(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
) -> Result<Vec<AppSetting>, String> {
    ipc!(data, "swift_list_settings", serde_json::json!({}), async {
        data.settings(&host)
            .await?
            .all()
            .await
            .map_err(|e| e.to_string())
    })
}

// --- Writes -------------------------------------------------------------

/// Inserts a project (use a non-nil client-generated id).
#[tauri::command]
pub async fn swift_create_project(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    project: Project,
) -> Result<Project, String> {
    ipc!(data, "swift_create_project", project, async {
        data.projects(&host)
            .await?
            .insert(project)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Updates an existing project.
#[tauri::command]
pub async fn swift_update_project(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    project: Project,
) -> Result<Project, String> {
    ipc!(data, "swift_update_project", project, async {
        data.projects(&host)
            .await?
            .update(project)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Archives a project and closes out all its tasks (sets them to 100%).
///
/// Returns the updated project. Task completion and the archive flag are
/// applied in sequence (not a single transaction).
#[tauri::command]
pub async fn swift_archive_project(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    id: Uuid,
) -> Result<Project, String> {
    ipc!(data, "swift_archive_project", serde_json::json!({ "id": id }), async {
        let projects = data.projects(&host).await?;
        let mut project = projects
            .get(id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("project not found: {id}"))?;

        data.tasks(&host)
            .await?
            .complete_all_for_project(id)
            .await
            .map_err(|e| e.to_string())?;

        project.archived = true;
        project.percent_complete = 100;
        projects.update(project).await.map_err(|e| e.to_string())
    })
}

/// Deletes a project (tasks and knowledge cascade in the schema).
#[tauri::command]
pub async fn swift_delete_project(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    id: Uuid,
) -> Result<(), String> {
    ipc!(data, "swift_delete_project", serde_json::json!({ "id": id }), async {
        data.projects(&host)
            .await?
            .delete(id)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Inserts a task (use a non-nil client-generated id).
#[tauri::command]
pub async fn swift_create_task(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    task: Task,
) -> Result<Task, String> {
    ipc!(data, "swift_create_task", task, async {
        data.tasks(&host)
            .await?
            .insert(task)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Updates an existing task.
#[tauri::command]
pub async fn swift_update_task(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    task: Task,
) -> Result<Task, String> {
    ipc!(data, "swift_update_task", task, async {
        data.tasks(&host)
            .await?
            .update(task)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Deletes a task.
#[tauri::command]
pub async fn swift_delete_task(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    id: Uuid,
) -> Result<(), String> {
    ipc!(data, "swift_delete_task", serde_json::json!({ "id": id }), async {
        data.tasks(&host)
            .await?
            .delete(id)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Replaces the predecessor links of a task with finish-to-start links.
#[tauri::command]
pub async fn swift_set_task_predecessors(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    project_id: Uuid,
    successor_id: Uuid,
    predecessor_ids: Vec<Uuid>,
) -> Result<Vec<TaskLink>, String> {
    ipc!(
        data,
        "swift_set_task_predecessors",
        serde_json::json!({
            "project_id": project_id,
            "successor_id": successor_id,
            "predecessor_ids": predecessor_ids,
        }),
        async {
            data.task_links(&host)
                .await?
                .set_predecessors(project_id, successor_id, &predecessor_ids)
                .await
                .map_err(|e| e.to_string())
        }
    )
}

/// Inserts a knowledge category (use a non-nil client-generated id).
#[tauri::command]
pub async fn swift_create_knowledge_category(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    category: KnowledgeCategory,
) -> Result<KnowledgeCategory, String> {
    ipc!(data, "swift_create_knowledge_category", category, async {
        data.knowledge_categories(&host)
            .await?
            .insert(category)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Deletes a knowledge category (fails if articles reference it).
#[tauri::command]
pub async fn swift_delete_knowledge_category(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    id: Uuid,
) -> Result<(), String> {
    ipc!(data, "swift_delete_knowledge_category", serde_json::json!({ "id": id }), async {
        data.knowledge_categories(&host)
            .await?
            .delete(id)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Inserts a knowledge article (use a non-nil client-generated id).
#[tauri::command]
pub async fn swift_create_knowledge_article(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    article: KnowledgeArticle,
) -> Result<KnowledgeArticle, String> {
    ipc!(data, "swift_create_knowledge_article", article, async {
        data.knowledge_articles(&host)
            .await?
            .insert(article)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Updates a knowledge article's editable fields.
#[tauri::command]
pub async fn swift_update_knowledge_article(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    article: KnowledgeArticle,
) -> Result<KnowledgeArticle, String> {
    ipc!(data, "swift_update_knowledge_article", article, async {
        data.knowledge_articles(&host)
            .await?
            .update(article)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Deletes a knowledge article (revisions cascade).
#[tauri::command]
pub async fn swift_delete_knowledge_article(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    id: Uuid,
) -> Result<(), String> {
    ipc!(data, "swift_delete_knowledge_article", serde_json::json!({ "id": id }), async {
        data.knowledge_articles(&host)
            .await?
            .delete(id)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Appends a revision to an article, assigning the next revision number.
///
/// `revision.revision_number` is ignored and recomputed server-side.
#[tauri::command]
pub async fn swift_add_knowledge_revision(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    revision: KnowledgeRevision,
) -> Result<KnowledgeRevision, String> {
    ipc!(data, "swift_add_knowledge_revision", revision, async {
        let repo = data.knowledge_revisions(&host).await?;
        let mut revision = revision;
        revision.revision_number = repo
            .next_revision_number(revision.article_id)
            .await
            .map_err(|e| e.to_string())?;
        repo.insert(revision).await.map_err(|e| e.to_string())
    })
}

// --- Project files ------------------------------------------------------

/// A file the user picked in the native dialog (not yet attached).
#[derive(Debug, Serialize)]
pub struct PickedFile {
    /// Absolute source path.
    pub path: String,
    /// File name with extension.
    pub file_name: String,
    /// Lower-case extension without the dot (or empty).
    pub file_type: String,
    /// Size in bytes.
    pub size_bytes: i64,
}

/// Lower-case extension (no dot) for a path, or empty string.
fn extension_of(path: &Path) -> String {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default()
}

/// Sanitizes a slug/name into a filesystem-safe single path segment.
fn safe_folder_name(raw: &str) -> String {
    let cleaned: String = raw
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '-'
            }
        })
        .collect();
    let trimmed = cleaned.trim_matches('-').to_string();
    if trimmed.is_empty() {
        "project".to_string()
    } else {
        trimmed
    }
}

/// Returns a file name that does not collide inside `dir`, appending ` (n)`.
fn unique_file_name(dir: &Path, original: &str) -> String {
    if !dir.join(original).exists() {
        return original.to_string();
    }
    let path = Path::new(original);
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or(original);
    let ext = path.extension().and_then(|e| e.to_str());
    for n in 2..10_000 {
        let candidate = match ext {
            Some(ext) => format!("{stem} ({n}).{ext}"),
            None => format!("{stem} ({n})"),
        };
        if !dir.join(&candidate).exists() {
            return candidate;
        }
    }
    original.to_string()
}

/// Lists a project's attached files (most recently added first).
#[tauri::command]
pub async fn swift_list_project_files(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    project_id: Uuid,
) -> Result<Vec<ProjectFile>, String> {
    ipc!(data, "swift_list_project_files", serde_json::json!({ "project_id": project_id }), async {
        data.project_files(&host)
            .await?
            .list_by_project(project_id)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Opens a native file picker and returns the chosen file's metadata.
///
/// Returns `None` when the user cancels. No file is copied yet — pass the
/// returned `path` to [`swift_add_project_file`].
#[tauri::command]
pub async fn swift_pick_file(data: State<'_, SwiftData>) -> Result<Option<PickedFile>, String> {
    data.log_call("swift_pick_file", &serde_json::json!({}));
    let handle = rfd::AsyncFileDialog::new()
        .set_title("Choose a file to attach")
        .pick_file()
        .await;
    let result = handle.map(|handle| {
        let path = handle.path().to_path_buf();
        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("file")
            .to_string();
        let size_bytes = std::fs::metadata(&path).map(|m| m.len() as i64).unwrap_or(0);
        PickedFile {
            path: path.to_string_lossy().to_string(),
            file_type: extension_of(&path),
            file_name,
            size_bytes,
        }
    });
    data.log_result("swift_pick_file", Ok(result))
}

/// Opens a native folder picker (used to choose the project files root).
#[tauri::command]
pub async fn swift_pick_folder(data: State<'_, SwiftData>) -> Result<Option<String>, String> {
    data.log_call("swift_pick_folder", &serde_json::json!({}));
    let handle = rfd::AsyncFileDialog::new()
        .set_title("Choose the project files root folder")
        .pick_folder()
        .await;
    let result = handle.map(|h| h.path().to_string_lossy().to_string());
    data.log_result("swift_pick_folder", Ok(result))
}

/// Copies a source file into the project's folder and records its metadata.
///
/// The destination is `<files root>/<project slug>/<file name>`; the files root
/// must be set in Settings → File first. The stored path is recorded relative
/// to the root so the root can be relocated later.
#[tauri::command]
pub async fn swift_add_project_file(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    project_id: Uuid,
    source_path: String,
    title: String,
    description: Option<String>,
) -> Result<ProjectFile, String> {
    ipc!(
        data,
        "swift_add_project_file",
        serde_json::json!({
            "project_id": project_id,
            "source_path": source_path,
            "title": title,
        }),
        async {
            let root = data.files_root(&host).await?.ok_or_else(|| {
                "Project files location is not set. Choose it in Settings → File.".to_string()
            })?;

            let project = data
                .projects(&host)
                .await?
                .get(project_id)
                .await
                .map_err(|e| e.to_string())?
                .ok_or_else(|| format!("project not found: {project_id}"))?;

            let source = PathBuf::from(&source_path);
            if !source.is_file() {
                return Err(format!("source file not found: {source_path}"));
            }

            let folder = safe_folder_name(if project.slug.is_empty() {
                &project.name
            } else {
                &project.slug
            });
            let project_dir = root.join(&folder);
            std::fs::create_dir_all(&project_dir)
                .map_err(|e| format!("failed to create project folder: {e}"))?;

            let original = source
                .file_name()
                .and_then(|n| n.to_str())
                .ok_or_else(|| "invalid source file name".to_string())?;
            let dest_name = unique_file_name(&project_dir, original);
            let dest = project_dir.join(&dest_name);

            std::fs::copy(&source, &dest).map_err(|e| format!("failed to copy file: {e}"))?;

            let size_bytes = std::fs::metadata(&dest).map(|m| m.len() as i64).unwrap_or(0);
            let file_type = extension_of(&dest);
            let title = if title.trim().is_empty() {
                dest_name.clone()
            } else {
                title.trim().to_string()
            };
            let description = description
                .map(|d| d.trim().to_string())
                .filter(|d| !d.is_empty());

            let now = chrono::Utc::now();
            let entity = ProjectFile {
                id: Uuid::new_v4(),
                project_id,
                title,
                file_name: dest_name,
                file_type,
                description,
                size_bytes,
                stored_path: format!("{folder}/{}", dest.file_name().unwrap().to_string_lossy()),
                created_at: now,
                updated_at: now,
            };

            data.project_files(&host)
                .await?
                .insert(entity)
                .await
                .map_err(|e| e.to_string())
        }
    )
}

/// Deletes a project file record and removes the copied file from disk.
#[tauri::command]
pub async fn swift_delete_project_file(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    id: Uuid,
) -> Result<(), String> {
    ipc!(data, "swift_delete_project_file", serde_json::json!({ "id": id }), async {
        let repo = data.project_files(&host).await?;
        let file = repo.get(id).await.map_err(|e| e.to_string())?;
        repo.delete(id).await.map_err(|e| e.to_string())?;

        if let (Some(file), Ok(Some(root))) = (file, data.files_root(&host).await) {
            let path = root.join(&file.stored_path);
            let _ = std::fs::remove_file(path);
        }
        Ok(())
    })
}

/// Launches a project file with the operating system's default application.
#[tauri::command]
pub async fn swift_open_project_file(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    id: Uuid,
) -> Result<(), String> {
    ipc!(data, "swift_open_project_file", serde_json::json!({ "id": id }), async {
        let root = data
            .files_root(&host)
            .await?
            .ok_or_else(|| "Project files location is not set.".to_string())?;
        let file = data
            .project_files(&host)
            .await?
            .get(id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("project file not found: {id}"))?;

        let path = root.join(&file.stored_path);
        open::that(&path).map_err(|e| format!("failed to open file: {e}"))
    })
}

/// Upserts a settings section (`key` = section id, `value` = section JSON).
#[tauri::command]
pub async fn swift_set_setting(
    host: State<'_, NestHostState>,
    data: State<'_, SwiftData>,
    key: String,
    value: Value,
) -> Result<(), String> {
    ipc!(
        data,
        "swift_set_setting",
        serde_json::json!({ "key": key, "value": value }),
        async {
            data.settings(&host)
                .await?
                .set(&key, &value)
                .await
                .map_err(|e| e.to_string())
        }
    )
}
