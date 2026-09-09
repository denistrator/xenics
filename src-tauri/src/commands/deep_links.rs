use crate::diagnostics::error::{ErrorCode, RetryClass, XenicsError};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReaderTarget {
    pub source_id: String,
    pub ref_name: String,
    pub path: String,
    pub anchor: Option<String>,
}

pub fn parse_xenics_url(url: &str) -> Result<ReaderTarget, XenicsError> {
    let rest = url
        .strip_prefix("xenics://docs/")
        .ok_or_else(|| invalid("URL must use xenics://docs/"))?;
    let (source_id, query) = rest
        .split_once('?')
        .ok_or_else(|| invalid("deep link requires query parameters"))?;
    let values: std::collections::HashMap<_, _> = query
        .split('&')
        .filter_map(|pair| pair.split_once('='))
        .collect();
    let ref_name = values
        .get("ref")
        .ok_or_else(|| invalid("deep link requires ref"))?
        .to_string();
    let path = values
        .get("path")
        .ok_or_else(|| invalid("deep link requires path"))?
        .to_string();
    if source_id.is_empty()
        || ref_name.is_empty()
        || path.is_empty()
        || path.split('/').any(|part| part == "..")
    {
        return Err(invalid("deep link target is invalid"));
    }
    Ok(ReaderTarget {
        source_id: source_id.to_string(),
        ref_name,
        path,
        anchor: values.get("anchor").map(|value| value.to_string()),
    })
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
}
