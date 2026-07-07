//! CBRE-inspired light theme for Swift (matches cbre.com brand greens).

use nest_design::theme::{ThemeDefinition, ThemeId, ThemeMode};
use nest_design::tokens::{
    ColorToken, ColorTokens, RadiusTokens, SpacingTokens, StatusTokens, TypographyStyle,
    TypographyTokens,
};

/// Returns the Swift / CBRE light theme definition.
pub fn cbre_light() -> ThemeDefinition {
    ThemeDefinition {
        id: ThemeId::new("cbre-light"),
        mode: ThemeMode::Light,
        colors: ColorTokens {
            // cbre.com: clean white canvas
            background: color("#FFFFFF"),
            // Navy body copy for strong contrast (#1C293C)
            foreground: color("#1C293C"),
            // CBRE corporate green (#003F2D)
            primary: color("#003F2D"),
            // Secondary brand green (#006A4D)
            secondary: color("#006A4D"),
            // Visible grid/chrome borders
            border: color("#B8BFC6"),
            // Warm light panels (#F4F4F1)
            surface: color("#F4F4F1"),
            // Lime accent for highlights (#69BE28)
            accent: Some(color("#69BE28")),
            // Readable secondary text (#4A5568)
            muted: Some(color("#4A5568")),
        },
        spacing: SpacingTokens {
            xs: 4.0,
            sm: 8.0,
            md: 16.0,
            lg: 24.0,
            xl: 32.0,
            xxl: Some(48.0),
        },
        radius: RadiusTokens {
            sm: 2.0,
            md: 4.0,
            lg: 6.0,
            full: Some(9999.0),
        },
        typography: TypographyTokens {
            body: TypographyStyle {
                font_family: "Segoe UI, system-ui, -apple-system, sans-serif".to_string(),
                size: 14.0,
                line_height: 20.0,
                weight: 400,
            },
            heading: TypographyStyle {
                font_family: "Segoe UI, system-ui, -apple-system, sans-serif".to_string(),
                size: 20.0,
                line_height: 28.0,
                weight: 600,
            },
            caption: Some(TypographyStyle {
                font_family: "Segoe UI, system-ui, -apple-system, sans-serif".to_string(),
                size: 12.0,
                line_height: 16.0,
                weight: 400,
            }),
            mono: Some(TypographyStyle {
                font_family: "Consolas, Menlo, monospace".to_string(),
                size: 12.0,
                line_height: 16.0,
                weight: 400,
            }),
        },
        status: StatusTokens {
            success: color("#006A4D"),
            warning: color("#B45309"),
            error: color("#B91C1C"),
            info: color("#003F2D"),
        },
    }
}

fn color(value: &str) -> ColorToken {
    ColorToken::new(value).expect("cbre theme colors are valid")
}
