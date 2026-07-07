//! Read-only integration checks against a live Swift database.
//!
//! Run: `DATABASE_URL=... cargo test -p swift-data -- --ignored`

use nest_data_postgres::{PostgresConfig, PostgresConnection};
use swift_data::{
    KnowledgeArticleRepository, ProjectRepository, SettingsRepository, TaskLinkRepository,
    TaskRepository,
};

async fn connect() -> PostgresConnection {
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    PostgresConnection::connect(&PostgresConfig::new(url))
        .await
        .expect("connect")
}

#[tokio::test]
#[ignore = "requires DATABASE_URL to a seeded Swift database"]
async fn reads_seeded_projects_tasks_knowledge() {
    let conn = connect().await;

    let projects = ProjectRepository::new(conn.clone())
        .list_library()
        .await
        .expect("projects");
    assert_eq!(projects.len(), 5, "expected 5 seeded projects");

    let nest = projects
        .iter()
        .find(|p| p.slug == "nest")
        .expect("nest project");

    let tasks = TaskRepository::new(conn.clone())
        .list_by_project(nest.id)
        .await
        .expect("tasks");
    assert_eq!(tasks.len(), 42, "expected 42 nest tasks");

    let links = TaskLinkRepository::new(conn.clone())
        .list_by_project(nest.id)
        .await
        .expect("links");
    assert!(!links.is_empty(), "expected predecessor links");

    let articles = KnowledgeArticleRepository::new(conn.clone());
    let hits = articles
        .keyword_search("postgres", 5, Some(nest.id))
        .await
        .expect("keyword search");
    assert!(!hits.is_empty(), "keyword search should return results");

    let settings = SettingsRepository::new(conn)
        .all()
        .await
        .expect("settings");
    assert_eq!(settings.len(), 7, "expected 7 settings sections");
}
