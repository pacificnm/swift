//! Swift schema migrations, embedded from `migrations/*.sql`.
//!
//! Pass these to [`nest_data_postgres::PostgresDataModule::with_migrations`] to
//! bootstrap a fresh database. An already-provisioned database (see
//! `docs/specs/database-schema.md`) records these ids in `_nest_migrations`.

use nest_data::{Migration, SqlMigration};

const NO_DOWN: &str = "-- no automated down migration";

/// Returns the ordered Swift migrations.
pub fn swift_migrations() -> Vec<Box<dyn Migration>> {
    vec![
        boxed("001_extensions", include_str!("../migrations/001_extensions.sql")),
        boxed("002_calendars", include_str!("../migrations/002_calendars.sql")),
        boxed("003_projects", include_str!("../migrations/003_projects.sql")),
        boxed("004_tasks", include_str!("../migrations/004_tasks.sql")),
        boxed("005_knowledge", include_str!("../migrations/005_knowledge.sql")),
        boxed("006_app_settings", include_str!("../migrations/006_app_settings.sql")),
        boxed("007_project_files", include_str!("../migrations/007_project_files.sql")),
    ]
}

fn boxed(id: &str, up: &str) -> Box<dyn Migration> {
    Box::new(SqlMigration::new(id.to_string(), up.to_string(), NO_DOWN.to_string()))
}

/// Migration ids in apply order (for reconciling `_nest_migrations`).
pub const MIGRATION_IDS: &[&str] = &[
    "001_extensions",
    "002_calendars",
    "003_projects",
    "004_tasks",
    "005_knowledge",
    "006_app_settings",
    "007_project_files",
];
