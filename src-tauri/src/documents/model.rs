use serde::Serialize;
use std::path::PathBuf;

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceLocation {
    pub line: usize,
    pub column: usize,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ReaderBlock {
    Heading {
        level: u8,
        text: String,
        location: SourceLocation,
    },
    Paragraph {
        text: String,
        location: SourceLocation,
    },
    Code {
        language: String,
        text: String,
        location: SourceLocation,
    },
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentLink {
    pub label: String,
    pub target: String,
    pub location: SourceLocation,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchRecord {
    pub text: String,
    pub location: SourceLocation,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum WarningCode {
    UnsupportedComponent,
    UnsafeHtml,
    Malformed,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Warning {
    pub code: WarningCode,
    pub message: String,
    pub location: Option<SourceLocation>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedDocument {
    pub path: PathBuf,
    pub blocks: Vec<ReaderBlock>,
    pub links: Vec<DocumentLink>,
    pub search_records: Vec<SearchRecord>,
    pub warnings: Vec<Warning>,
    pub executed_javascript: bool,
}

impl ParsedDocument {
    pub fn reader_text(&self) -> String {
        self.blocks
            .iter()
            .map(|block| match block {
                ReaderBlock::Heading { text, .. }
                | ReaderBlock::Paragraph { text, .. }
                | ReaderBlock::Code { text, .. } => text.as_str(),
            })
            .collect::<Vec<_>>()
            .join("\n")
    }
    pub fn reader_link(&self, target: &str) -> Option<&DocumentLink> {
        self.links.iter().find(|link| link.target == target)
    }
    pub fn search_heading(&self, text: &str) -> Option<&SearchRecord> {
        self.search_records
            .iter()
            .find(|record| record.text == text)
    }
}
