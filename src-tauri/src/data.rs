//! Lazy PostgreSQL access for Swift IPC commands.
//!
//! The pool is created on first use *inside Tauri's async runtime* (via a
//! [`tokio::sync::OnceCell`]) rather than at module-configure time, so sqlx
//! connections bind to the runtime that actually executes the commands.

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

use nest_data_postgres::{PostgresConfig, PostgresConnection};
use nest_tauri::{ConfigService, NestHostState};
use serde::{Deserialize, Serialize};
use tokio::sync::OnceCell;

use swift_data::{
    KnowledgeArticleRepository, KnowledgeCategoryRepository, KnowledgeRevisionRepository,
    ProjectFileRepository, ProjectRepository, SettingsRepository, TaskLinkRepository,
    TaskRepository,
};

/// Tracing target for IPC command diagnostics (lands in `logs/swift`).
const IPC_TARGET: &str = "swift::ipc";

/// `[database]` section of `config.toml`.
#[derive(Debug, Deserialize)]
struct DatabaseConfig {
    url: String,
}

/// Shared, lazily-connected Swift data handle managed as Tauri state.
pub struct SwiftData {
    connection: OnceCell<PostgresConnection>,
    /// When set, every IPC command logs its args and result via `tracing`.
    debug_logging: AtomicBool,
}

impl SwiftData {
    /// Creates an unconnected handle. The pool opens on first command.
    pub fn new() -> Self {
        Self {
            connection: OnceCell::new(),
            debug_logging: AtomicBool::new(false),
        }
    }

    /// Enables or disables IPC command logging at runtime.
    pub fn set_debug_logging(&self, enabled: bool) {
        self.debug_logging.store(enabled, Ordering::Relaxed);
    }

    /// Whether IPC command logging is currently enabled.
    pub fn debug_logging(&self) -> bool {
        self.debug_logging.load(Ordering::Relaxed)
    }

    /// Logs an incoming command and its arguments when debug logging is on.
    pub fn log_call<T: Serialize>(&self, command: &str, args: &T) {
        if !self.debug_logging() {
            return;
        }
        let args = serde_json::to_string(args)
            .unwrap_or_else(|e| format!("<args serialize error: {e}>"));
        tracing::info!(target: IPC_TARGET, command, args = %args, "ipc call");
    }

    /// Logs a command result (ok output or error) and returns it unchanged.
    pub fn log_result<T: Serialize>(
        &self,
        command: &str,
        result: Result<T, String>,
    ) -> Result<T, String> {
        if self.debug_logging() {
            match &result {
                Ok(value) => {
                    let output = serde_json::to_string(value)
                        .unwrap_or_else(|e| format!("<output serialize error: {e}>"));
                    tracing::info!(target: IPC_TARGET, command, output = %output, "ipc ok");
                }
                Err(error) => {
                    tracing::error!(target: IPC_TARGET, command, error = %error, "ipc error");
                }
            }
        }
        result
    }

    /// Returns the shared connection, connecting on first use.
    ///
    /// The database URL is read from the merged `[database]` config section.
    async fn connection(&self, host: &NestHostState) -> Result<PostgresConnection, String> {
        self.connection
            .get_or_try_init(|| async {
                let url = {
                    let config = host
                        .context
                        .service::<ConfigService>()
                        .map_err(|e| e.to_string())?;
                    config
                        .section::<DatabaseConfig>("database")
                        .map_err(|e| e.to_string())?
                        .url
                };
                PostgresConnection::connect(&PostgresConfig::new(url))
                    .await
                    .map_err(|e| e.to_string())
            })
            .await
            .cloned()
    }

    /// Project repository over the shared connection.
    pub async fn projects(&self, host: &NestHostState) -> Result<ProjectRepository, String> {
        Ok(ProjectRepository::new(self.connection(host).await?))
    }

    /// Task repository over the shared connection.
    pub async fn tasks(&self, host: &NestHostState) -> Result<TaskRepository, String> {
        Ok(TaskRepository::new(self.connection(host).await?))
    }

    /// Task-link repository over the shared connection.
    pub async fn task_links(&self, host: &NestHostState) -> Result<TaskLinkRepository, String> {
        Ok(TaskLinkRepository::new(self.connection(host).await?))
    }

    /// Knowledge category repository over the shared connection.
    pub async fn knowledge_categories(
        &self,
        host: &NestHostState,
    ) -> Result<KnowledgeCategoryRepository, String> {
        Ok(KnowledgeCategoryRepository::new(self.connection(host).await?))
    }

    /// Knowledge article repository over the shared connection.
    pub async fn knowledge_articles(
        &self,
        host: &NestHostState,
    ) -> Result<KnowledgeArticleRepository, String> {
        Ok(KnowledgeArticleRepository::new(self.connection(host).await?))
    }

    /// Knowledge revision repository over the shared connection.
    pub async fn knowledge_revisions(
        &self,
        host: &NestHostState,
    ) -> Result<KnowledgeRevisionRepository, String> {
        Ok(KnowledgeRevisionRepository::new(self.connection(host).await?))
    }

    /// Project file repository over the shared connection.
    pub async fn project_files(
        &self,
        host: &NestHostState,
    ) -> Result<ProjectFileRepository, String> {
        Ok(ProjectFileRepository::new(self.connection(host).await?))
    }

    /// Settings repository over the shared connection.
    pub async fn settings(&self, host: &NestHostState) -> Result<SettingsRepository, String> {
        Ok(SettingsRepository::new(self.connection(host).await?))
    }

    /// Returns the configured project files root, if set.
    ///
    /// Stored in `app_settings` under the `file` section as `projectFilesRoot`
    /// (set from Swift Settings → File → Project files location).
    pub async fn files_root(&self, host: &NestHostState) -> Result<Option<PathBuf>, String> {
        let value = self
            .settings(host)
            .await?
            .get("file")
            .await
            .map_err(|e| e.to_string())?;
        let root = value
            .as_ref()
            .and_then(|v| v.get("projectFilesRoot"))
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(PathBuf::from);
        Ok(root)
    }
}

impl Default for SwiftData {
    fn default() -> Self {
        Self::new()
    }
}
