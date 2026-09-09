use std::borrow::Cow;

pub fn sanitize(output: &str, document_content: &str) -> String {
    let without_credentials = redact_credentials(output);
    let without_content =
        without_credentials.replace(document_content, "[document content redacted]");
    without_content
        .lines()
        .filter(|line| !line.to_ascii_lowercase().contains("authorization:"))
        .collect::<Vec<_>>()
        .join("\n")
}

fn redact_credentials(value: &str) -> Cow<'_, str> {
    let Some(scheme_end) = value.find("://") else {
        return Cow::Borrowed(value);
    };
    let authority_start = scheme_end + 3;
    let Some(authority_end) = value[authority_start..].find('/') else {
        return Cow::Borrowed(value);
    };
    let authority_end = authority_start + authority_end;
    let authority = &value[authority_start..authority_end];
    let Some(at) = authority.find('@') else {
        return Cow::Borrowed(value);
    };
    let start = authority_start;
    let end = authority_start + at + 1;
    Cow::Owned(format!(
        "{}[credentials redacted]{}",
        &value[..start],
        &value[end..]
    ))
}

#[cfg(test)]
mod tests {
    use super::sanitize;

    #[test]
    fn diagnostics_redact_credentials_private_urls_and_document_content() {
        let diagnostics = sanitize(
            "https://token@example.test/private/docs",
            "secret document body",
        );
        assert!(!diagnostics.contains("token@"));
        assert!(!diagnostics.contains("secret document body"));
        assert!(diagnostics.contains("[credentials redacted]"));
    }
}
