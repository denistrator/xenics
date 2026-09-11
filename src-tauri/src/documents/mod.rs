mod capabilities;
mod discovery;
mod indexer;
mod model;
mod parser;
mod search;

pub use capabilities::{CapabilityProfile, CapabilityReport};
pub use discovery::{DiscoveryPreview, DocumentDiscovery};
pub use indexer::{IndexReport, Indexer};
pub use model::{
    DocumentLink, InlineSpan, ParsedDocument, ReaderBlock, SearchRecord, SourceLocation, Warning,
    WarningCode,
};
pub use parser::DocumentParser;
pub use search::SearchService;

#[cfg(test)]
mod search_tests;
#[cfg(test)]
mod tests;
