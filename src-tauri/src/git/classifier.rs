use crate::diagnostics::error::{ErrorCode, RetryClass, XenicsError};

pub fn classify_git_failure(status: i32, stderr: &str) -> XenicsError {
    let authentication = stderr.to_ascii_lowercase().contains("authentication")
        || stderr
            .to_ascii_lowercase()
            .contains("could not read username")
        || stderr.to_ascii_lowercase().contains("permission denied");
    let mut error = XenicsError::new(
        if authentication {
            ErrorCode::GitAuthentication
        } else {
            ErrorCode::GitCommandFailed
        },
        if authentication {
            RetryClass::NeedsAction
        } else if status == 128 {
            RetryClass::Automatic
        } else {
            RetryClass::Permanent
        },
    );
    error.message = sanitize(stderr);
    error
}

fn sanitize(value: &str) -> String {
    let mut result = value.to_owned();
    if let Some(scheme) = result.find("://") {
        if let Some(at) = result[scheme + 3..].find('@') {
            let at = scheme + 3 + at;
            let host_start = result[..scheme + 3].len();
            result.replace_range(host_start..at, "<redacted>");
        }
    }
    result
}
