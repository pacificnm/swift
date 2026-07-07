//! Knowledge base entities and repositories (mirror `knowledgeDemo.ts`).

use chrono::{DateTime, Utc};
use nest_data::{DataError, DataResult};
use nest_data_postgres::{PostgresConnection, SimilarityHit, VectorSearch};
use pgvector::Vector;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::error::map_sqlx;

/// A knowledge category within a project.
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct KnowledgeCategory {
    /// Primary key.
    pub id: Uuid,
    /// Owning project.
    pub project_id: Uuid,
    /// Category name.
    pub name: String,
    /// Optional description.
    pub description: Option<String>,
    /// Sort order within the project.
    pub sort_order: i32,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

const CATEGORY_COLUMNS: &str =
    "id, project_id, name, description, sort_order, created_at, updated_at";

/// A knowledge article (current head; history in [`KnowledgeRevision`]).
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct KnowledgeArticle {
    /// Primary key.
    pub id: Uuid,
    /// Owning project.
    pub project_id: Uuid,
    /// Category.
    pub category_id: Uuid,
    /// Title.
    pub title: String,
    /// Markdown body.
    pub body: String,
    /// Source type (`manual`, `doc`, `email`, `slack`, `url`).
    pub source_type: String,
    /// Human-readable source label.
    pub source_label: String,
    /// Optional source URI.
    pub source_uri: Option<String>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
    /// Last embedding/index timestamp.
    pub indexed_at: Option<DateTime<Utc>>,
}

// Excludes `embedding` (vector) and `search_text` (tsvector) — managed separately.
const ARTICLE_COLUMNS: &str = "id, project_id, category_id, title, body, source_type, \
    source_label, source_uri, created_at, updated_at, indexed_at";

/// A point-in-time revision of an article.
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct KnowledgeRevision {
    /// Primary key.
    pub id: Uuid,
    /// Parent article.
    pub article_id: Uuid,
    /// Sequential revision number.
    pub revision_number: i32,
    /// Title snapshot.
    pub title: String,
    /// Body snapshot.
    pub body: String,
    /// Optional change note.
    pub change_note: Option<String>,
    /// Author label.
    pub created_by: String,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
}

const REVISION_COLUMNS: &str =
    "id, article_id, revision_number, title, body, change_note, created_by, created_at";

/// Category CRUD.
pub struct KnowledgeCategoryRepository {
    db: PostgresConnection,
}

impl KnowledgeCategoryRepository {
    /// Creates a repository over the given connection.
    pub fn new(db: PostgresConnection) -> Self {
        Self { db }
    }

    /// Lists categories for a project.
    pub async fn list_by_project(&self, project_id: Uuid) -> DataResult<Vec<KnowledgeCategory>> {
        let sql = format!(
            "SELECT {CATEGORY_COLUMNS} FROM knowledge_categories WHERE project_id = $1 \
             ORDER BY sort_order"
        );
        sqlx::query_as::<_, KnowledgeCategory>(sqlx::AssertSqlSafe(sql))
            .bind(project_id)
            .fetch_all(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    /// Inserts a category.
    pub async fn insert(&self, c: KnowledgeCategory) -> DataResult<KnowledgeCategory> {
        let id = if c.id.is_nil() { Uuid::new_v4() } else { c.id };
        let sql = format!(
            "INSERT INTO knowledge_categories (id, project_id, name, description, sort_order) \
             VALUES ($1,$2,$3,$4,$5) RETURNING {CATEGORY_COLUMNS}"
        );
        sqlx::query_as::<_, KnowledgeCategory>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .bind(c.project_id)
            .bind(&c.name)
            .bind(&c.description)
            .bind(c.sort_order)
            .fetch_one(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    /// Deletes a category (fails if articles reference it).
    pub async fn delete(&self, id: Uuid) -> DataResult<()> {
        let result = sqlx::query("DELETE FROM knowledge_categories WHERE id = $1")
            .bind(id)
            .execute(self.db.pool())
            .await
            .map_err(map_sqlx)?;
        if result.rows_affected() == 0 {
            return Err(DataError::not_found(format!("category not found: {id}")));
        }
        Ok(())
    }
}

/// Article CRUD plus vector/keyword search and embedding updates.
pub struct KnowledgeArticleRepository {
    db: PostgresConnection,
}

impl KnowledgeArticleRepository {
    /// Creates a repository over the given connection.
    pub fn new(db: PostgresConnection) -> Self {
        Self { db }
    }

    /// Fetches an article by id.
    pub async fn get(&self, id: Uuid) -> DataResult<Option<KnowledgeArticle>> {
        let sql = format!("SELECT {ARTICLE_COLUMNS} FROM knowledge_articles WHERE id = $1");
        sqlx::query_as::<_, KnowledgeArticle>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .fetch_optional(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    /// Lists articles for a project (most recently updated first).
    pub async fn list_by_project(&self, project_id: Uuid) -> DataResult<Vec<KnowledgeArticle>> {
        let sql = format!(
            "SELECT {ARTICLE_COLUMNS} FROM knowledge_articles WHERE project_id = $1 \
             ORDER BY updated_at DESC"
        );
        sqlx::query_as::<_, KnowledgeArticle>(sqlx::AssertSqlSafe(sql))
            .bind(project_id)
            .fetch_all(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    /// Inserts an article.
    pub async fn insert(&self, a: KnowledgeArticle) -> DataResult<KnowledgeArticle> {
        let id = if a.id.is_nil() { Uuid::new_v4() } else { a.id };
        let sql = format!(
            "INSERT INTO knowledge_articles (id, project_id, category_id, title, body, \
             source_type, source_label, source_uri) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) \
             RETURNING {ARTICLE_COLUMNS}"
        );
        sqlx::query_as::<_, KnowledgeArticle>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .bind(a.project_id)
            .bind(a.category_id)
            .bind(&a.title)
            .bind(&a.body)
            .bind(&a.source_type)
            .bind(&a.source_label)
            .bind(&a.source_uri)
            .fetch_one(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    /// Updates an article's editable fields.
    pub async fn update(&self, a: KnowledgeArticle) -> DataResult<KnowledgeArticle> {
        let sql = format!(
            "UPDATE knowledge_articles SET category_id=$2, title=$3, body=$4, source_type=$5, \
             source_label=$6, source_uri=$7, updated_at=now() WHERE id=$1 RETURNING {ARTICLE_COLUMNS}"
        );
        let updated = sqlx::query_as::<_, KnowledgeArticle>(sqlx::AssertSqlSafe(sql))
            .bind(a.id)
            .bind(a.category_id)
            .bind(&a.title)
            .bind(&a.body)
            .bind(&a.source_type)
            .bind(&a.source_label)
            .bind(&a.source_uri)
            .fetch_optional(self.db.pool())
            .await
            .map_err(map_sqlx)?;
        updated.ok_or_else(|| DataError::not_found(format!("article not found: {}", a.id)))
    }

    /// Deletes an article (revisions cascade).
    pub async fn delete(&self, id: Uuid) -> DataResult<()> {
        let result = sqlx::query("DELETE FROM knowledge_articles WHERE id = $1")
            .bind(id)
            .execute(self.db.pool())
            .await
            .map_err(map_sqlx)?;
        if result.rows_affected() == 0 {
            return Err(DataError::not_found(format!("article not found: {id}")));
        }
        Ok(())
    }

    /// Stores an embedding and marks the article indexed.
    pub async fn update_embedding(&self, id: Uuid, embedding: &[f32]) -> DataResult<()> {
        let vector = Vector::from(embedding.to_vec());
        let result = sqlx::query(
            "UPDATE knowledge_articles SET embedding = $1, indexed_at = now() WHERE id = $2",
        )
        .bind(vector)
        .bind(id)
        .execute(self.db.pool())
        .await
        .map_err(map_sqlx)?;
        if result.rows_affected() == 0 {
            return Err(DataError::not_found(format!("article not found: {id}")));
        }
        Ok(())
    }

    /// Semantic (vector) search. Pass `project_id` to scope, or `None` for workspace-wide.
    pub async fn search_similar(
        &self,
        embedding: &[f32],
        limit: u32,
        project_id: Option<Uuid>,
    ) -> DataResult<Vec<SimilarityHit>> {
        let search = VectorSearch::new(self.db.pool(), "knowledge_articles", "id", "embedding")
            .with_project_scope("project_id");
        let project = project_id.map(|id| id.to_string());
        search.search_similar(embedding, limit, project.as_deref()).await
    }

    /// Keyword (tsvector) search over title + body.
    pub async fn keyword_search(
        &self,
        query: &str,
        limit: u32,
        project_id: Option<Uuid>,
    ) -> DataResult<Vec<KnowledgeArticle>> {
        let base = format!(
            "SELECT {ARTICLE_COLUMNS} FROM knowledge_articles \
             WHERE search_text @@ plainto_tsquery('english', $1)"
        );
        if let Some(project_id) = project_id {
            let sql = format!(
                "{base} AND project_id = $2 \
                 ORDER BY ts_rank(search_text, plainto_tsquery('english', $1)) DESC LIMIT $3"
            );
            sqlx::query_as::<_, KnowledgeArticle>(sqlx::AssertSqlSafe(sql))
                .bind(query)
                .bind(project_id)
                .bind(limit as i64)
                .fetch_all(self.db.pool())
                .await
                .map_err(map_sqlx)
        } else {
            let sql = format!(
                "{base} ORDER BY ts_rank(search_text, plainto_tsquery('english', $1)) DESC LIMIT $2"
            );
            sqlx::query_as::<_, KnowledgeArticle>(sqlx::AssertSqlSafe(sql))
                .bind(query)
                .bind(limit as i64)
                .fetch_all(self.db.pool())
                .await
                .map_err(map_sqlx)
        }
    }
}

/// Append-only revision history repository.
pub struct KnowledgeRevisionRepository {
    db: PostgresConnection,
}

impl KnowledgeRevisionRepository {
    /// Creates a repository over the given connection.
    pub fn new(db: PostgresConnection) -> Self {
        Self { db }
    }

    /// Lists revisions for an article (newest first).
    pub async fn list_by_article(&self, article_id: Uuid) -> DataResult<Vec<KnowledgeRevision>> {
        let sql = format!(
            "SELECT {REVISION_COLUMNS} FROM knowledge_revisions WHERE article_id = $1 \
             ORDER BY revision_number DESC"
        );
        sqlx::query_as::<_, KnowledgeRevision>(sqlx::AssertSqlSafe(sql))
            .bind(article_id)
            .fetch_all(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    /// Appends a revision. `revision_number` should be the next in sequence.
    pub async fn insert(&self, r: KnowledgeRevision) -> DataResult<KnowledgeRevision> {
        let id = if r.id.is_nil() { Uuid::new_v4() } else { r.id };
        let sql = format!(
            "INSERT INTO knowledge_revisions (id, article_id, revision_number, title, body, \
             change_note, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING {REVISION_COLUMNS}"
        );
        sqlx::query_as::<_, KnowledgeRevision>(sqlx::AssertSqlSafe(sql))
            .bind(id)
            .bind(r.article_id)
            .bind(r.revision_number)
            .bind(&r.title)
            .bind(&r.body)
            .bind(&r.change_note)
            .bind(&r.created_by)
            .fetch_one(self.db.pool())
            .await
            .map_err(map_sqlx)
    }

    /// Returns the next revision number for an article.
    pub async fn next_revision_number(&self, article_id: Uuid) -> DataResult<i32> {
        let row: (Option<i32>,) = sqlx::query_as(
            "SELECT MAX(revision_number) FROM knowledge_revisions WHERE article_id = $1",
        )
        .bind(article_id)
        .fetch_one(self.db.pool())
        .await
        .map_err(map_sqlx)?;
        Ok(row.0.unwrap_or(0) + 1)
    }
}
