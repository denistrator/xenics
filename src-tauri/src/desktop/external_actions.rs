use std::path::Path;

use crate::diagnostics::error::{ErrorCode, RetryClass, XenicsError};

pub fn open_browser_request(url: &str) -> Result<(), XenicsError> {
    let parsed = url::Url::parse(url).map_err(|_| invalid_url())?;
    if !matches!(parsed.scheme(), "http" | "https") || parsed.host_str().is_none() {
        return Err(invalid_url());
    }
    Ok(())
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    open_browser_request(&url).map_err(|error| error.message)?;
    tauri_plugin_opener::open_url(url, None::<&str>).map_err(|error| error.to_string())
}

pub fn open_folder_request(path: &Path) -> Result<(), XenicsError> {
    if path.is_dir() {
        Ok(())
    } else {
        Err(desktop_error("folder does not exist"))
    }
}

#[tauri::command]
pub fn open_external_folder(path: String) -> Result<(), String> {
    let folder = Path::new(&path);
    open_folder_request(folder).map_err(|error| error.message)?;
    tauri_plugin_opener::open_path(folder, None::<&str>).map_err(|error| error.to_string())
}

fn invalid_url() -> XenicsError {
    desktop_error("only valid HTTP(S) URLs can be opened")
}

fn desktop_error(message: &str) -> XenicsError {
    let mut error = XenicsError::new(ErrorCode::Unknown, RetryClass::NeedsAction);
    error.message = message.into();
    error
}

#[cfg(test)]
mod tests {
    use super::open_browser_request;

    #[test]
    fn external_browser_action_accepts_only_valid_http_urls() {
        assert!(open_browser_request("https://example.test/docs").is_ok());
        assert!(open_browser_request("javascript:alert(1)").is_err());
    }
}
