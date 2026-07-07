//! Project file entity and repository (mirrors `MockProjectFile`).
//!
//! Rows track metadata for files copied into a per-project folder under the
//! configured files root. `stored_path` is relative to that root so the root
//! can be relocated without rewriting rows.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use nest_data::{AsyncRepository, DataError, DataResult, ListQuery};
use nest_data_postgres::PostgresConnection;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::error::map_sqlx;

/// A file attached to a project.
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ProjectFile {
    /// Primary key.
    pub id: Uuid,
    /// Owning project.
    pub project_id: Uuid,
    /// Display title (defaults to the original file name).
    pub title: String,
    /// On-disk file name (may be de-duplicated on copy).
    pub file_name: String,
    /// Lower-case extension without the dot (e.g. `pdf`), or empty.
    pub file_type: String,
    /// Optional description.
    pub description: Option<String>,
    /// File size in bytes.
    pub size_bytes: i64,
    /// Path relative to the configured files root (e.g. `my-project/report.pdf`).
    pub stored_path: String,
    /// Creation timestamp (date added).
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

const COLUMNS: &str = "id, project_id, title, file_name, file_type, description, size_bytes, \
    stored_path, created_at, updated_at";

/// PostgreSQL-backed project file repository.
pub struct ProjectFileRepository {
    db: PostgresConnection,
}

impl ProjectFileRepository {
    /// Creates a repository over the given connection.
    pub fn new(db: PostgresConnection) -> Self {
        Self { db }
    }

    /// Lists a project's files, most recently added first.
    pub async fn list_by_project(&self, project_id: Uuid) -> DataResult<Vec<ProjectFile>> {
        let sql = format!(
            "SELECT {COLUMNS} FROM project_files WHERE project_id = $1 ORDER BY created_at DESC"
        );
        sqlx::query_as::<_, ProjectFile>(sqlx::AssertSqlSafe(sql))
            .bind(project_id)
            .fetch_all(self.db.pool())
            .await
            .map_err(map_sqlx)
    }
}

#[async_trait]
impl AsyncRepository<ProjectFile, Uuid> for ProjectFileRepository {
    async fn get(&self, id: Uuid) -> DataResult<Option<ProjectFile>> {
        let sql = format!("SELECT {COLUMNS} FROM project_files WHERE id = $1");
        sqlx::query_as::<_, ProjectFile>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .fetch_optional(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    async fn list(&self, query: ListQuery) -> DataResult<Vec<ProjectFile>> {
        let mut sql = format!("SELECT {COLUMNS} FROM project_files ORDER BY created_at DESC");
        if let Some(limit) = query.limit {
            sql.push_str(&format!(" LIMIT {limit}"));
        }
        if let Some(offset) = query.offset {
            sql.push_str(&format!(" OFFSET {offset}"));
        }
        sqlx::query_as::<_, ProjectFile>(sqlx::AssertSqlSafe(sql))
            .fetch_all(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    async fn insert(&self, entity: ProjectFile) -> DataResult<ProjectFile> {
        let id = if entity.id.is_nil() { Uuid::new_v4() } else { entity.id };
        let sql = format!(
            "INSERT INTO project_files (id, project_id, title, file_name, file_type, description, \
             size_bytes, stored_path) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING {COLUMNS}"
        );
        sqlx::query_as::<_, ProjectFile>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .bind(entity.project_id)
            .bind(&entity.title)
            .bind(&entity.file_name)
            .bind(&entity.file_type)
            .bind(&entity.description)
            .bind(entity.size_bytes)
            .bind(&entity.stored_path)
            .fetch_one(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    async fn update(&self, entity: ProjectFile) -> DataResult<ProjectFile> {
        let sql = format!(
            "UPDATE project_files SET title=$2, file_name=$3, file_type=$4, description=$5, \
             size_bytes=$6, stored_path=$7, updated_at=now() WHERE id=$1 RETURNING {COLUMNS}"
        );
        let updated = sqlx::query_as::<_, ProjectFile>(sqlx::AssertSqlSafe(sql))
            .bind(entity.id)
            .bind(&entity.title)
            .bind(&entity.file_name)
            .bind(&entity.file_type)
            .bind(&entity.description)
            .bind(entity.size_bytes)
            .bind(&entity.stored_path)
            .fetch_optional(self.db.pool())
            .await
            .map_err(map_sqlx)?;
        updated.ok_or_else(|| DataError::not_found(format!("project file not found: {}", entity.id)))
    }

    async fn delete(&self, id: Uuid) -> DataResult<()> {
        let result = sqlx::query("DELETE FROM project_files WHERE id = $1")
            .bind(id)
            .execute(self.db.pool())
            .await
            .map_err(map_sqlx)?;
        if result.rows_affected() == 0 {
            return Err(DataError::not_found(format!("project file not found: {id}")));
        }
        Ok(())
    }
}
