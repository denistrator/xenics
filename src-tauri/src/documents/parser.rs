use super::model::*;
use std::path::Path;

pub struct DocumentParser;

impl DocumentParser {
    pub fn parse(path: impl AsRef<Path>, bytes: &[u8]) -> Result<ParsedDocument, String> {
        let path = path.as_ref().to_path_buf();
        let text = String::from_utf8(bytes.to_vec())
            .map_err(|_| "document is not valid UTF-8".to_owned())?;
        let mut blocks = Vec::new();
        let mut links = Vec::new();
        let mut search_records = Vec::new();
        let mut warnings = Vec::new();
        let mut executed_javascript = false;
        let mut in_code = false;
        let mut code = String::new();
        let mut language = String::new();
        let mut code_line = 0;
        for (index, raw) in text.lines().enumerate() {
            let line = index + 1;
            let trimmed = raw.trim();
            if let Some(fence) = trimmed.strip_prefix("```") {
                if in_code {
                    blocks.push(ReaderBlock::Code {
                        language: language.clone(),
                        text: code.trim_end().into(),
                        location: SourceLocation {
                            line: code_line,
                            column: 1,
                        },
                    });
                    code.clear();
                    in_code = false;
                } else {
                    language = fence.trim().into();
                    code_line = line + 1;
                    in_code = true;
                }
                continue;
            }
            if in_code {
                code.push_str(raw);
                code.push('\n');
                continue;
            }
            if trimmed.starts_with("<script")
                || trimmed.starts_with("<iframe")
                || trimmed.starts_with("<style")
            {
                executed_javascript = false;
                warnings.push(Warning {
                    code: WarningCode::UnsafeHtml,
                    message: "unsafe HTML was omitted".into(),
                    location: Some(SourceLocation { line, column: 1 }),
                });
                continue;
            }
            if trimmed.starts_with('<') && trimmed.ends_with('>') {
                warnings.push(Warning {
                    code: WarningCode::UnsupportedComponent,
                    message: "unsupported component rendered as text fallback".into(),
                    location: Some(SourceLocation { line, column: 1 }),
                });
                continue;
            }
            if let Some(start) = trimmed.find('[') {
                if let Some(mid) = trimmed[start..].find("](") {
                    if let Some(end) = trimmed[start + mid + 2..].find(')') {
                        let label = &trimmed[start + 1..start + mid];
                        let target = &trimmed[start + mid + 2..start + mid + 2 + end];
                        links.push(DocumentLink {
                            label: label.into(),
                            target: target.into(),
                            location: SourceLocation { line, column: 1 },
                        });
                    }
                }
            }
            if let Some((prefix, value)) = trimmed.split_once(' ') {
                if prefix.starts_with('#') && prefix.chars().all(|c| c == '#') {
                    let level = prefix.len() as u8;
                    let raw_value = value.trim();
                    let search_text = raw_value
                        .split('[')
                        .next()
                        .unwrap_or(raw_value)
                        .trim()
                        .to_owned();
                    let value = plain_text(raw_value);
                    let location = SourceLocation { line, column: 1 };
                    search_records.push(SearchRecord {
                        text: search_text,
                        location: location.clone(),
                    });
                    blocks.push(ReaderBlock::Heading {
                        level,
                        text: value,
                        location,
                    });
                    continue;
                }
            }
            if !trimmed.is_empty() {
                blocks.push(ReaderBlock::Paragraph {
                    text: trimmed.into(),
                    location: SourceLocation { line, column: 1 },
                });
            }
        }
        if in_code {
            warnings.push(Warning {
                code: WarningCode::Malformed,
                message: "unclosed code fence".into(),
                location: Some(SourceLocation {
                    line: code_line,
                    column: 1,
                }),
            });
            blocks.push(ReaderBlock::Code {
                language,
                text: code.trim_end().into(),
                location: SourceLocation {
                    line: code_line,
                    column: 1,
                },
            });
        }
        Ok(ParsedDocument {
            path,
            blocks,
            links,
            search_records,
            warnings,
            executed_javascript,
        })
    }
}

fn plain_text(value: &str) -> String {
    let mut result = value.to_owned();
    while let Some(start) = result.find('[') {
        let Some(mid) = result[start..].find("](") else {
            break;
        };
        let Some(end) = result[start + mid + 2..].find(')') else {
            break;
        };
        let label = result[start + 1..start + mid].to_owned();
        result.replace_range(start..start + mid + 2 + end + 1, &label);
    }
    result
}
