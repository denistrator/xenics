use crate::diagnostics::error::{ErrorCode, RetryClass, XenicsError};

mod migrations;
mod repository;
mod search_db;
mod user_db;

pub use repository::RebuildReport;
pub use search_db::{SearchDb, SearchHit};
pub use user_db::UserDb;

fn database_error(error: rusqlite::Error) -> XenicsError {
    let mut result = XenicsError::new(ErrorCode::Database, RetryClass::Automatic);
    result.message = error.to_string();
    result
}

#[cfg(test)]
mod tests;
