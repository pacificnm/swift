#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod theme;
mod theme_module;

use std::sync::Arc;

use nest_cache::Cache;
use nest_cache_file::{FileCacheAdapter, FileCacheConfig};
use nest_image::ImageModule;
use nest_tauri::TauriApp;
use theme_module::SwiftThemeModule;

fn main() {
    let cache_root = std::env::temp_dir().join("swift-cache");
    let cache = Cache::new(Arc::new(
        FileCacheAdapter::new(FileCacheConfig::new(&cache_root))
            .expect("failed to open image cache directory"),
    ));

    TauriApp::new("swift")
        .module(SwiftThemeModule)
        .module(ImageModule::with_cache(cache))
        .run(tauri::generate_context!());
}
