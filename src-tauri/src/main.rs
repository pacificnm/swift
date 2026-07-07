#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod data;

use std::path::PathBuf;
use std::sync::Arc;

use nest_cache::Cache;
use nest_cache_file::{FileCacheAdapter, FileCacheConfig};
use nest_image::ImageModule;
use nest_logging::LoggingConfig;
use nest_tauri::TauriApp;
use nest_theme::ThemeModule;

use crate::data::SwiftData;

/// Locates `config.toml` (which holds `[database]`, `[ollama]`, etc.).
///
/// `tauri dev` runs with the working directory at `src-tauri/`, while the config
/// lives one level up in `apps/swift/`. Nest's default search is cwd-relative and
/// would miss it, so we probe the parent explicitly. Returns `None` to fall back
/// to Nest's default search (e.g. `~/.config/swift/config.toml`) in bundles.
fn resolve_config_path() -> Option<PathBuf> {
    for candidate in ["config.toml", "../config.toml"] {
        let path = PathBuf::from(candidate);
        if path.exists() {
            return Some(path);
        }
    }
    None
}

/// Chooses a writable log directory for the current run.
///
/// Under `tauri dev` the working directory is `src-tauri/` (where
/// `tauri.conf.json` lives), so logs go to `../logs` (i.e. `apps/swift/logs`),
/// keeping them out of `src-tauri/` so the dev watcher does not rebuild. A
/// shipped binary can be launched from anywhere (e.g. `~`), where `../logs`
/// would resolve to an unwritable path; there we use the platform data dir
/// (`~/.local/share/swift/logs`, `~/Library/Application Support/swift/logs`,
/// `%APPDATA%\\swift\\logs`), falling back to the temp dir.
fn resolve_log_dir() -> PathBuf {
    if PathBuf::from("tauri.conf.json").exists() {
        return PathBuf::from("../logs");
    }
    dirs::data_dir()
        .map(|dir| dir.join("swift").join("logs"))
        .unwrap_or_else(|| std::env::temp_dir().join("swift").join("logs"))
}

fn main() {
    let cache_root = std::env::temp_dir().join("swift-cache");
    let cache = Cache::new(Arc::new(
        FileCacheAdapter::new(FileCacheConfig::new(&cache_root))
            .expect("failed to open image cache directory"),
    ));

    let mut app = TauriApp::new("swift")
        .with_logging(LoggingConfig::for_tauri("swift").with_file(resolve_log_dir()))
        .module(ThemeModule::default())
        .module(ImageModule::with_cache(cache));

    if let Some(config_path) = resolve_config_path() {
        app = app.with_config_path(config_path);
    }

    app.with_builder(|builder| {
        builder
            .manage(SwiftData::new())
            .plugin(commands::swift_plugin())
    })
    .run(tauri::generate_context!());
}
