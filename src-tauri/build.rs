/// Commands exposed by the inline `swift` Tauri plugin (see `commands.rs`).
///
/// Listing them here lets `tauri-build` autogenerate `allow-*`/`deny-*` ACL
/// permissions and a `swift:default` set. Without this, Tauri v2 denies every
/// `plugin:swift|*` invoke and the UI silently falls back to mock data.
/// Keep in sync with `swift_plugin`'s `generate_handler!`.
const SWIFT_COMMANDS: &[&str] = &[
    "swift_list_projects",
    "swift_list_tasks",
    "swift_list_task_links",
    "swift_list_knowledge_categories",
    "swift_list_knowledge_articles",
    "swift_list_knowledge_revisions",
    "swift_search_knowledge",
    "swift_list_settings",
    "swift_create_project",
    "swift_update_project",
    "swift_archive_project",
    "swift_delete_project",
    "swift_create_task",
    "swift_update_task",
    "swift_delete_task",
    "swift_set_task_predecessors",
    "swift_create_knowledge_category",
    "swift_delete_knowledge_category",
    "swift_create_knowledge_article",
    "swift_update_knowledge_article",
    "swift_delete_knowledge_article",
    "swift_add_knowledge_revision",
    "swift_set_setting",
    "swift_list_project_files",
    "swift_pick_file",
    "swift_pick_folder",
    "swift_add_project_file",
    "swift_delete_project_file",
    "swift_open_project_file",
    "swift_set_debug_logging",
    "swift_get_debug_logging",
];

fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new().plugin(
            "swift",
            tauri_build::InlinedPlugin::new()
                .commands(SWIFT_COMMANDS)
                .default_permission(tauri_build::DefaultPermissionRule::AllowAllCommands),
        ),
    )
    .expect("failed to run tauri-build");
}
