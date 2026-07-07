//! Registers the CBRE light theme as Swift's active palette.

use nest_core::{AppBuilder, Module, ModuleId, NestResult};
use nest_design::ThemeId;
use nest_theme::ThemeService;

use crate::theme::cbre_light;

/// Module id for [`SwiftThemeModule`].
pub const SWIFT_THEME_MODULE_ID: ModuleId = ModuleId("swift-theme");

/// Registers `cbre-light` and sets it as the active theme.
pub struct SwiftThemeModule;

impl Module for SwiftThemeModule {
    fn id(&self) -> ModuleId {
        SWIFT_THEME_MODULE_ID
    }

    fn configure(&self, app: &mut AppBuilder) -> NestResult<()> {
        let service = ThemeService::new();
        service.register_theme(cbre_light())?;
        service.set_active_theme(&ThemeId::from("cbre-light"))?;
        app.register_service(service)
    }
}
