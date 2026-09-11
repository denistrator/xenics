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
pub enum InlineSpan {
    Text {
        text: String,
    },
    Emphasis {
        children: Vec<InlineSpan>,
    },
    Strong {
        children: Vec<InlineSpan>,
    },
    InlineCode {
        text: String,
    },
    Link {
        target: String,
        children: Vec<InlineSpan>,
    },
}

impl InlineSpan {
    pub fn text(&self) -> String {
        match self {
            Self::Text { text } | Self::InlineCode { text } => text.clone(),
            Self::Emphasis { children }
            | Self::Strong { children }
            | Self::Link { children, .. } => {
                children.iter().map(Self::text).collect::<Vec<_>>().join("")
            }
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ReaderBlock {
    Heading {
        level: u8,
        text: String,
        inline: Vec<InlineSpan>,
        location: SourceLocation,
    },
    Paragraph {
        text: String,
        inline: Vec<InlineSpan>,
        location: SourceLocation,
    },
    Code {
        language: String,
        text: String,
        location: SourceLocation,
    },
    Image {
        alt: String,
        url: String,
        location: SourceLocation,
    },
    Table {
        headers: Vec<Vec<InlineSpan>>,
        rows: Vec<Vec<Vec<InlineSpan>>>,
        text: String,
        location: SourceLocation,
    },
    List {
        ordered: bool,
        items: Vec<Vec<InlineSpan>>,
        text: String,
        location: SourceLocation,
    },
    BlockQuote {
        text: String,
        inline: Vec<InlineSpan>,
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
                | ReaderBlock::Code { text, .. }
                | ReaderBlock::Table { text, .. }
                | ReaderBlock::List { text, .. }
                | ReaderBlock::BlockQuote { text, .. } => text.as_str(),
                ReaderBlock::Image { alt, .. } => alt.as_str(),
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
