use crate::diagnostics::error::{ErrorCode, RetryClass, XenicsError};
use serde::Serialize;

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReaderTarget {
    pub source_id: String,
    pub ref_name: String,
    pub path: String,
    pub anchor: Option<String>,
}

#[tauri::command]
pub fn parse_deep_link(url: String) -> Result<ReaderTarget, String> {
    parse_xenics_url(&url).map_err(|error| error.message)
}

pub fn parse_xenics_url(url: &str) -> Result<ReaderTarget, XenicsError> {
    let parsed = url::Url::parse(url).map_err(|_| invalid("invalid Xenics URL"))?;
    let source_id = parsed
        .path()
        .strip_prefix('/')
        .filter(|value| !value.is_empty() && !value.contains('/'))
        .ok_or_else(|| invalid("deep link source is invalid"))?;
    if parsed.scheme() != "xenics"
        || parsed.host_str() != Some("docs")
        || !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.port().is_some()
    {
        return Err(invalid("deep link authority is invalid"));
    }
    let values: std::collections::HashMap<_, _> = parsed.query_pairs().into_owned().collect();
    let ref_name = values
        .get("ref")
        .filter(|value| is_safe_value(value))
        .ok_or_else(|| invalid("deep link requires a valid ref"))?;
    let path = values
        .get("path")
        .filter(|value| is_safe_relative_path(value))
        .ok_or_else(|| invalid("deep link target is invalid"))?;
    if !is_safe_value(source_id) {
        return Err(invalid("deep link target is invalid"));
    }
    let anchor = values.get("anchor").cloned();
    if anchor.as_deref().is_some_and(|value| !is_safe_value(value)) {
        return Err(invalid("deep link anchor is invalid"));
    }
    Ok(ReaderTarget {
        source_id: source_id.to_owned(),
        ref_name: ref_name.to_owned(),
        path: path.to_owned(),
        anchor,
    })
}

fn is_safe_value(value: &str) -> bool {
    !value.is_empty() && !value.chars().any(|character| character.is_control())
}

fn is_safe_relative_path(value: &str) -> bool {
    is_safe_value(value)
        && !value.starts_with('/')
        && !value.contains('\\')
        && !value
            .split('/')
            .any(|segment| segment.is_empty() || segment == "." || segment == "..")
}
fn invalid(message: &str) -> XenicsError {
    let mut error = XenicsError::new(ErrorCode::InvalidDeepLink, RetryClass::Permanent);
    error.message = message.into();
    error
}

#[cfg(test)]
mod tests {
    use super::parse_xenics_url;
    #[test]
    fn deep_link_preserves_branch_tag_and_path() {
        let target = parse_xenics_url("xenics://docs/react?ref=main&path=learn/start.md").unwrap();
        assert_eq!(target.ref_name, "main");
        assert_eq!(target.path, "learn/start.md");
    }
    #[test]
    fn deep_link_rejects_traversal() {
        assert!(parse_xenics_url("xenics://docs/react?ref=main&path=../secret").is_err());
    }
    #[test]
    fn deep_link_decodes_safe_values_and_rejects_unsafe_authority() {
        let target = parse_xenics_url(
            "xenics://docs/react?ref=release%2F1&path=learn%2Fstart.md&anchor=install",
        )
        .unwrap();
        assert_eq!(target.ref_name, "release/1");
        assert_eq!(target.path, "learn/start.md");
        assert_eq!(target.anchor.as_deref(), Some("install"));

        for url in [
            "xenics://docs/react?ref=main&path=%2Fetc%2Fpasswd",
            "xenics://docs/react?ref=main&path=docs%5C..%5Csecret.md",
            "xenics://docs:secret@react?ref=main&path=README.md",
        ] {
            assert!(parse_xenics_url(url).is_err(), "unsafe URL accepted: {url}");
        }
    }
}
