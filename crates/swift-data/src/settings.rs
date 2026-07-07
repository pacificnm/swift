//! App settings repository (mirrors `AppSettings` sections in `settingsDemo.ts`).

use nest_data::{DataResult, ListQuery};
use nest_data_postgres::PostgresConnection;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;

use crate::error::map_sqlx;

/// A settings section stored as JSON (`key` = file/task/view/…).
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AppSetting {
    /// Section key.
    pub key: String,
    /// Section value object.
    pub value_json: Value,
}

/// Key/value settings repository.
pub struct SettingsRepository {
    db: PostgresConnection,
}

impl SettingsRepository {
    /// Creates a repository over the given connection.
    pub fn new(db: PostgresConnection) -> Self {
        Self { db }
    }

    /// Returns all settings sections.
    pub async fn all(&self) -> DataResult<Vec<AppSetting>> {
        sqlx::query_as::<_, AppSetting>("SELECT key, value_json FROM app_settings ORDER BY key")
            .fetch_all(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    /// Returns a single section's JSON value.
    pub async fn get(&self, key: &str) -> DataResult<Option<Value>> {
        let row: Option<(Value,)> =
            sqlx::query_as("SELECT value_json FROM app_settings WHERE key = $1")
                .bind(key)
                .fetch_optional(self.db.pool())
                .await
                .map_err(map_sqlx)?;
        Ok(row.map(|(value,)| value))
    }

    /// Upserts a settings section.
    pub async fn set(&self, key: &str, value: &Value) -> DataResult<()> {
        sqlx::query(
            "INSERT INTO app_settings (key, value_json, updated_at) VALUES ($1, $2, now()) \
             ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = now()",
        )
        .bind(key)
        .bind(value)
        .execute(self.db.pool())
        .await
        .map_err(map_sqlx)?;
        Ok(())
    }

    /// Convenience list wrapper honoring limit/offset.
    pub async fn list(&self, query: ListQuery) -> DataResult<Vec<AppSetting>> {
        let mut sql = String::from("SELECT key, value_json FROM app_settings ORDER BY key");
        if let Some(limit) = query.limit {
            sql.push_str(&format!(" LIMIT {limit}"));
        }
        if let Some(offset) = query.offset {
            sql.push_str(&format!(" OFFSET {offset}"));
        }
        sqlx::query_as::<_, AppSetting>(sqlx::AssertSqlSafe(sql))
            .fetch_all(self.db.pool())
            .await
            .map_err(map_sqlx)
    }
}
