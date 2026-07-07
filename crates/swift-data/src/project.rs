//! Project entity and repository (mirrors `MockProject`).

use async_trait::async_trait;
use chrono::{DateTime, NaiveDate, Utc};
use nest_data::{AsyncRepository, DataError, DataResult, ListQuery};
use nest_data_postgres::PostgresConnection;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::error::map_sqlx;

/// A Swift project row.
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Project {
    /// Primary key.
    pub id: Uuid,
    /// URL-safe unique key (among non-archived).
    pub slug: String,
    /// Display name.
    pub name: String,
    /// Optional description.
    pub description: Option<String>,
    /// Accent color (hex).
    pub color: String,
    /// Optional icon name.
    pub icon: Option<String>,
    /// Project manager label.
    pub manager: Option<String>,
    /// Archived flag.
    pub archived: bool,
    /// Pinned flag.
    pub pinned: bool,
    /// Cached rollup completion (0–100).
    pub percent_complete: i16,
    /// Scheduled start.
    pub start_date: Option<NaiveDate>,
    /// Scheduled finish.
    pub finish_date: Option<NaiveDate>,
    /// Status date (tracking baseline).
    pub status_date: Option<NaiveDate>,
    /// Priority label.
    pub priority: String,
    /// Working-time calendar.
    pub calendar_id: Option<Uuid>,
    /// Library ordering.
    pub sort_order: i32,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

const COLUMNS: &str = "id, slug, name, description, color, icon, manager, archived, pinned, \
    percent_complete, start_date, finish_date, status_date, priority, calendar_id, sort_order, \
    created_at, updated_at";

/// PostgreSQL-backed project repository.
pub struct ProjectRepository {
    db: PostgresConnection,
}

impl ProjectRepository {
    /// Creates a repository over the given connection.
    pub fn new(db: PostgresConnection) -> Self {
        Self { db }
    }

    /// Lists projects ordered for the Project Center (active/pinned first).
    pub async fn list_library(&self) -> DataResult<Vec<Project>> {
        let sql = format!(
            "SELECT {COLUMNS} FROM projects ORDER BY archived, pinned DESC, sort_order"
        );
        sqlx::query_as::<_, Project>(sqlx::AssertSqlSafe(sql))
            .fetch_all(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    /// Fetches a project by slug.
    pub async fn by_slug(&self, slug: &str) -> DataResult<Option<Project>> {
        let sql = format!("SELECT {COLUMNS} FROM projects WHERE slug = $1");
        sqlx::query_as::<_, Project>(sqlx::AssertSqlSafe(sql))
            .bind(slug)
            .fetch_optional(self.db.pool())
            .await
            .map_err(map_sqlx)
    }
}

#[async_trait]
impl AsyncRepository<Project, Uuid> for ProjectRepository {
    async fn get(&self, id: Uuid) -> DataResult<Option<Project>> {
        let sql = format!("SELECT {COLUMNS} FROM projects WHERE id = $1");
        sqlx::query_as::<_, Project>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .fetch_optional(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    async fn list(&self, query: ListQuery) -> DataResult<Vec<Project>> {
        let mut sql = format!("SELECT {COLUMNS} FROM projects ORDER BY sort_order");
        if let Some(limit) = query.limit {
            sql.push_str(&format!(" LIMIT {limit}"));
        }
        if let Some(offset) = query.offset {
            sql.push_str(&format!(" OFFSET {offset}"));
        }
        sqlx::query_as::<_, Project>(sqlx::AssertSqlSafe(sql))
            .fetch_all(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    async fn insert(&self, entity: Project) -> DataResult<Project> {
        let id = if entity.id.is_nil() { Uuid::new_v4() } else { entity.id };
        let sql = format!(
            "INSERT INTO projects (id, slug, name, description, color, icon, manager, archived, \
             pinned, percent_complete, start_date, finish_date, status_date, priority, \
             calendar_id, sort_order) \
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING {COLUMNS}"
        );
        sqlx::query_as::<_, Project>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .bind(&entity.slug)
            .bind(&entity.name)
            .bind(&entity.description)
            .bind(&entity.color)
            .bind(&entity.icon)
            .bind(&entity.manager)
            .bind(entity.archived)
            .bind(entity.pinned)
            .bind(entity.percent_complete)
            .bind(entity.start_date)
            .bind(entity.finish_date)
            .bind(entity.status_date)
            .bind(&entity.priority)
            .bind(entity.calendar_id)
            .bind(entity.sort_order)
            .fetch_one(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    async fn update(&self, entity: Project) -> DataResult<Project> {
        let sql = format!(
            "UPDATE projects SET slug=$2, name=$3, description=$4, color=$5, icon=$6, manager=$7, \
             archived=$8, pinned=$9, percent_complete=$10, start_date=$11, finish_date=$12, \
             status_date=$13, priority=$14, calendar_id=$15, sort_order=$16, updated_at=now() \
             WHERE id=$1 RETURNING {COLUMNS}"
        );
        let updated = sqlx::query_as::<_, Project>(sqlx::AssertSqlSafe(sql))
            .bind(entity.id)
            .bind(&entity.slug)
            .bind(&entity.name)
            .bind(&entity.description)
            .bind(&entity.color)
            .bind(&entity.icon)
            .bind(&entity.manager)
            .bind(entity.archived)
            .bind(entity.pinned)
            .bind(entity.percent_complete)
            .bind(entity.start_date)
            .bind(entity.finish_date)
            .bind(entity.status_date)
            .bind(&entity.priority)
            .bind(entity.calendar_id)
            .bind(entity.sort_order)
            .fetch_optional(self.db.pool())
            .await
            .map_err(map_sqlx)?;
        updated.ok_or_else(|| DataError::not_found(format!("project not found: {}", entity.id)))
    }

    async fn delete(&self, id: Uuid) -> DataResult<()> {
        let result = sqlx::query("DELETE FROM projects WHERE id = $1")
            .bind(id)
            .execute(self.db.pool())
            .await
            .map_err(map_sqlx)?;
        if result.rows_affected() == 0 {
            return Err(DataError::not_found(format!("project not found: {id}")));
        }
        Ok(())
    }
}
