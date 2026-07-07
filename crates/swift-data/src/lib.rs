//! Swift data layer: PostgreSQL repositories on top of `nest-data-postgres`.
//!
//! Entities mirror the UI mock types (`ui/src/mock/*.ts`) and the schema in
//! `docs/specs/database-schema.md`. Register [`SwiftDataModule`] after
//! [`nest_data_postgres::PostgresDataModule`].

#![deny(missing_docs)]
#![allow(clippy::result_large_err)]

mod error;

pub mod file;
pub mod knowledge;
pub mod migrations;
pub mod module;
pub mod project;
pub mod settings;
pub mod task;

pub use file::{ProjectFile, ProjectFileRepository};
pub use knowledge::{
    KnowledgeArticle, KnowledgeArticleRepository, KnowledgeCategory, KnowledgeCategoryRepository,
    KnowledgeRevision, KnowledgeRevisionRepository,
};
pub use migrations::{swift_migrations, MIGRATION_IDS};
pub use module::{SwiftDataModule, SWIFT_DATA_MODULE_ID};
pub use project::{Project, ProjectRepository};
pub use settings::{AppSetting, SettingsRepository};
pub use task::{Task, TaskLink, TaskLinkRepository, TaskRepository};

pub use nest_data::{AsyncRepository, DataError, DataResult, ListQuery};
pub use nest_data_postgres::{PostgresConnection, SimilarityHit};
