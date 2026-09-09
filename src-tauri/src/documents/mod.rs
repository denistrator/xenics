mod capabilities;
mod discovery;
mod model;
mod parser;

pub use capabilities::{CapabilityProfile, CapabilityReport};
pub use discovery::{DiscoveryPreview, DocumentDiscovery};
pub use model::{
    DocumentLink, ParsedDocument, ReaderBlock, SearchRecord, SourceLocation, Warning, WarningCode,
};
pub use parser::DocumentParser;

#[cfg(test)]
mod tests;
