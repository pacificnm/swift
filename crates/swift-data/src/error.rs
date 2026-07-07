//! Error mapping helpers for swift-data repositories.

use nest_data::DataError;

/// Maps an sqlx error into a nest-data query error, preserving the source.
pub(crate) fn map_sqlx(error: sqlx::Error) -> DataError {
    let message = error.to_string();
    DataError::query(message).with_source(error)
}
