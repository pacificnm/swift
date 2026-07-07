//! Task and task-link entities and repositories (mirror `MockTask`).

use async_trait::async_trait;
use chrono::{DateTime, NaiveDate, Utc};
use nest_data::{AsyncRepository, DataError, DataResult, ListQuery};
use nest_data_postgres::PostgresConnection;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::error::map_sqlx;

/// A task row within a project.
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Task {
    /// Primary key.
    pub id: Uuid,
    /// Owning project.
    pub project_id: Uuid,
    /// Outline parent (summary).
    pub parent_id: Option<Uuid>,
    /// Indent depth (0 = top level).
    pub outline_level: i16,
    /// Roll-up summary row.
    pub is_summary: bool,
    /// Zero-duration milestone.
    pub is_milestone: bool,
    /// Task name.
    pub title: String,
    /// Notes / linked knowledge text.
    pub notes: Option<String>,
    /// Duration in calendar days.
    pub duration_days: i32,
    /// Working duration in minutes (optional).
    pub duration_minutes: Option<i32>,
    /// Scheduled start.
    pub start_date: Option<NaiveDate>,
    /// Scheduled finish.
    pub finish_date: Option<NaiveDate>,
    /// Completion (0–100).
    pub percent_complete: i16,
    /// Free-text resource names (v1).
    pub resource_names: String,
    /// Priority label.
    pub priority: Option<String>,
    /// Constraint type.
    pub constraint_type: Option<String>,
    /// Constraint date.
    pub constraint_date: Option<NaiveDate>,
    /// Deadline.
    pub deadline: Option<NaiveDate>,
    /// Effort-driven flag.
    pub effort_driven: bool,
    /// Task type (Fixed Duration/Units/Work).
    pub task_type: Option<String>,
    /// Row order within outline.
    pub sort_order: i32,
    /// Actual start (tracking).
    pub actual_start: Option<NaiveDate>,
    /// Actual finish (tracking).
    pub actual_finish: Option<NaiveDate>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

const COLUMNS: &str = "id, project_id, parent_id, outline_level, is_summary, is_milestone, title, \
    notes, duration_days, duration_minutes, start_date, finish_date, percent_complete, \
    resource_names, priority, constraint_type, constraint_date, deadline, effort_driven, \
    task_type, sort_order, actual_start, actual_finish, created_at, updated_at";

/// PostgreSQL-backed task repository.
pub struct TaskRepository {
    db: PostgresConnection,
}

impl TaskRepository {
    /// Creates a repository over the given connection.
    pub fn new(db: PostgresConnection) -> Self {
        Self { db }
    }

    /// Lists tasks for a project in grid/Gantt order.
    pub async fn list_by_project(&self, project_id: Uuid) -> DataResult<Vec<Task>> {
        let sql = format!(
            "SELECT {COLUMNS} FROM tasks WHERE project_id = $1 ORDER BY sort_order"
        );
        sqlx::query_as::<_, Task>(sqlx::AssertSqlSafe(sql))
            .bind(project_id)
            .fetch_all(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    /// Marks every task in a project complete (100%), setting `actual_finish`
    /// to today where it is not already set. Returns the number of rows changed.
    pub async fn complete_all_for_project(&self, project_id: Uuid) -> DataResult<u64> {
        let result = sqlx::query(
            "UPDATE tasks SET percent_complete = 100, \
             actual_finish = COALESCE(actual_finish, CURRENT_DATE), updated_at = now() \
             WHERE project_id = $1 AND percent_complete < 100",
        )
        .bind(project_id)
        .execute(self.db.pool())
        .await
        .map_err(map_sqlx)?;
        Ok(result.rows_affected())
    }
}

#[async_trait]
impl AsyncRepository<Task, Uuid> for TaskRepository {
    async fn get(&self, id: Uuid) -> DataResult<Option<Task>> {
        let sql = format!("SELECT {COLUMNS} FROM tasks WHERE id = $1");
        sqlx::query_as::<_, Task>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .fetch_optional(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    async fn list(&self, query: ListQuery) -> DataResult<Vec<Task>> {
        let mut sql = format!("SELECT {COLUMNS} FROM tasks ORDER BY project_id, sort_order");
        if let Some(limit) = query.limit {
            sql.push_str(&format!(" LIMIT {limit}"));
        }
        if let Some(offset) = query.offset {
            sql.push_str(&format!(" OFFSET {offset}"));
        }
        sqlx::query_as::<_, Task>(sqlx::AssertSqlSafe(sql))
            .fetch_all(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    async fn insert(&self, entity: Task) -> DataResult<Task> {
        let id = if entity.id.is_nil() { Uuid::new_v4() } else { entity.id };
        let sql = format!(
            "INSERT INTO tasks (id, project_id, parent_id, outline_level, is_summary, is_milestone, \
             title, notes, duration_days, duration_minutes, start_date, finish_date, \
             percent_complete, resource_names, priority, constraint_type, constraint_date, \
             deadline, effort_driven, task_type, sort_order, actual_start, actual_finish) \
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) \
             RETURNING {COLUMNS}"
        );
        bind_task(sqlx::query_as::<_, Task>(sqlx::AssertSqlSafe(sql)), id, &entity)
            .fetch_one(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    async fn update(&self, entity: Task) -> DataResult<Task> {
        let sql = format!(
            "UPDATE tasks SET project_id=$2, parent_id=$3, outline_level=$4, is_summary=$5, \
             is_milestone=$6, title=$7, notes=$8, duration_days=$9, duration_minutes=$10, \
             start_date=$11, finish_date=$12, percent_complete=$13, resource_names=$14, \
             priority=$15, constraint_type=$16, constraint_date=$17, deadline=$18, \
             effort_driven=$19, task_type=$20, sort_order=$21, actual_start=$22, \
             actual_finish=$23, updated_at=now() WHERE id=$1 RETURNING {COLUMNS}"
        );
        let updated = bind_task(sqlx::query_as::<_, Task>(sqlx::AssertSqlSafe(sql)), entity.id, &entity)
            .fetch_optional(self.db.pool())
            .await
            .map_err(map_sqlx)?;
        updated.ok_or_else(|| DataError::not_found(format!("task not found: {}", entity.id)))
    }

    async fn delete(&self, id: Uuid) -> DataResult<()> {
        let result = sqlx::query("DELETE FROM tasks WHERE id = $1")
            .bind(id)
            .execute(self.db.pool())
            .await
            .map_err(map_sqlx)?;
        if result.rows_affected() == 0 {
            return Err(DataError::not_found(format!("task not found: {id}")));
        }
        Ok(())
    }
}

type TaskQueryAs<'a> =
    sqlx::query::QueryAs<'a, sqlx::Postgres, Task, sqlx::postgres::PgArguments>;

fn bind_task<'a>(query: TaskQueryAs<'a>, id: Uuid, t: &'a Task) -> TaskQueryAs<'a> {
    query
        .bind(id)
        .bind(t.project_id)
        .bind(t.parent_id)
        .bind(t.outline_level)
        .bind(t.is_summary)
        .bind(t.is_milestone)
        .bind(&t.title)
        .bind(&t.notes)
        .bind(t.duration_days)
        .bind(t.duration_minutes)
        .bind(t.start_date)
        .bind(t.finish_date)
        .bind(t.percent_complete)
        .bind(&t.resource_names)
        .bind(&t.priority)
        .bind(&t.constraint_type)
        .bind(t.constraint_date)
        .bind(t.deadline)
        .bind(t.effort_driven)
        .bind(&t.task_type)
        .bind(t.sort_order)
        .bind(t.actual_start)
        .bind(t.actual_finish)
}

/// A finish-to-start (etc.) dependency between two tasks.
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TaskLink {
    /// Primary key.
    pub id: Uuid,
    /// Owning project.
    pub project_id: Uuid,
    /// Task that must come first.
    pub predecessor_id: Uuid,
    /// Dependent task.
    pub successor_id: Uuid,
    /// Link type (`FS`, `SS`, `FF`, `SF`).
    pub link_type: String,
    /// Optional lag in minutes.
    pub lag_minutes: i32,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
}

const LINK_COLUMNS: &str =
    "id, project_id, predecessor_id, successor_id, link_type, lag_minutes, created_at";

/// PostgreSQL-backed task-link repository.
pub struct TaskLinkRepository {
    db: PostgresConnection,
}

impl TaskLinkRepository {
    /// Creates a repository over the given connection.
    pub fn new(db: PostgresConnection) -> Self {
        Self { db }
    }

    /// Lists links for a project.
    pub async fn list_by_project(&self, project_id: Uuid) -> DataResult<Vec<TaskLink>> {
        let sql = format!("SELECT {LINK_COLUMNS} FROM task_links WHERE project_id = $1");
        sqlx::query_as::<_, TaskLink>(sqlx::AssertSqlSafe(sql))
            .bind(project_id)
            .fetch_all(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    /// Lists predecessors of a task.
    pub async fn predecessors_of(&self, task_id: Uuid) -> DataResult<Vec<TaskLink>> {
        let sql = format!("SELECT {LINK_COLUMNS} FROM task_links WHERE successor_id = $1");
        sqlx::query_as::<_, TaskLink>(sqlx::AssertSqlSafe(sql))
            .bind(task_id)
            .fetch_all(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    /// Replaces every predecessor link of `successor_id` with finish-to-start
    /// links from the given predecessors, returning the new links.
    ///
    /// Self-references are ignored. Not transactional (delete then inserts).
    pub async fn set_predecessors(
        &self,
        project_id: Uuid,
        successor_id: Uuid,
        predecessor_ids: &[Uuid],
    ) -> DataResult<Vec<TaskLink>> {
        sqlx::query("DELETE FROM task_links WHERE successor_id = $1")
            .bind(successor_id)
            .execute(self.db.pool())
            .await
            .map_err(map_sqlx)?;

        let mut links = Vec::with_capacity(predecessor_ids.len());
        for predecessor_id in predecessor_ids {
            if *predecessor_id == successor_id {
                continue;
            }
            let link = self
                .insert(TaskLink {
                    id: Uuid::nil(),
                    project_id,
                    predecessor_id: *predecessor_id,
                    successor_id,
                    link_type: "FS".to_string(),
                    lag_minutes: 0,
                    created_at: Utc::now(),
                })
                .await?;
            links.push(link);
        }
        Ok(links)
    }

    /// Inserts a dependency link.
    pub async fn insert(&self, link: TaskLink) -> DataResult<TaskLink> {
        let id = if link.id.is_nil() { Uuid::new_v4() } else { link.id };
        let sql = format!(
            "INSERT INTO task_links (id, project_id, predecessor_id, successor_id, link_type, \
             lag_minutes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING {LINK_COLUMNS}"
        );
        sqlx::query_as::<_, TaskLink>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .bind(link.project_id)
            .bind(link.predecessor_id)
            .bind(link.successor_id)
            .bind(&link.link_type)
            .bind(link.lag_minutes)
            .fetch_one(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    /// Deletes a link by id.
    pub async fn delete(&self, id: Uuid) -> DataResult<()> {
        let result = sqlx::query("DELETE FROM task_links WHERE id = $1")
            .bind(id)
            .execute(self.db.pool())
            .await
            .map_err(map_sqlx)?;
        if result.rows_affected() == 0 {
            return Err(DataError::not_found(format!("task link not found: {id}")));
        }
        Ok(())
    }
}
