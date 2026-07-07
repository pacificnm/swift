//! Nest module that registers Swift repositories on the Postgres pool.

use nest_core::{AppBuilder, Module, ModuleId, NestResult};
use nest_data_postgres::{PostgresConnection, POSTGRES_DATA_MODULE_ID};

use crate::file::ProjectFileRepository;
use crate::knowledge::{
    KnowledgeArticleRepository, KnowledgeCategoryRepository, KnowledgeRevisionRepository,
};
use crate::project::ProjectRepository;
use crate::settings::SettingsRepository;
use crate::task::{TaskLinkRepository, TaskRepository};

/// Module id for [`SwiftDataModule`].
pub const SWIFT_DATA_MODULE_ID: ModuleId = ModuleId("swift-data");

/// Registers Swift repositories as services.
///
/// Depends on [`nest_data_postgres::PostgresDataModule`] (registers the pool).
/// Migrations are applied out-of-band or via `PostgresDataModule::with_migrations`
/// ([`crate::swift_migrations`]).
pub struct SwiftDataModule;

impl Module for SwiftDataModule {
    fn id(&self) -> ModuleId {
        SWIFT_DATA_MODULE_ID
    }

    fn dependencies(&self) -> &'static [ModuleId] {
        &[POSTGRES_DATA_MODULE_ID]
    }

    fn configure(&self, app: &mut AppBuilder) -> NestResult<()> {
        let conn = app.service_mut::<PostgresConnection>()?.clone();

        app.register_service(ProjectRepository::new(conn.clone()))?;
        app.register_service(ProjectFileRepository::new(conn.clone()))?;
        app.register_service(TaskRepository::new(conn.clone()))?;
        app.register_service(TaskLinkRepository::new(conn.clone()))?;
        app.register_service(KnowledgeCategoryRepository::new(conn.clone()))?;
        app.register_service(KnowledgeArticleRepository::new(conn.clone()))?;
        app.register_service(KnowledgeRevisionRepository::new(conn.clone()))?;
        app.register_service(SettingsRepository::new(conn))?;
        Ok(())
    }
}
