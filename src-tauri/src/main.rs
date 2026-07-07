#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod data;
mod theme;
mod theme_module;

use std::path::PathBuf;
use std::sync::Arc;

use nest_cache::Cache;
use nest_cache_file::{FileCacheAdapter, FileCacheConfig};
use nest_image::ImageModule;
use nest_tauri::TauriApp;
use theme_module::SwiftThemeModule;

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

fn main() {
    let cache_root = std::env::temp_dir().join("swift-cache");
    let cache = Cache::new(Arc::new(
        FileCacheAdapter::new(FileCacheConfig::new(&cache_root))
            .expect("failed to open image cache directory"),
    ));

    let mut app = TauriApp::new("swift")
        .module(SwiftThemeModule)
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
