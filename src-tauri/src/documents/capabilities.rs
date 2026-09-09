use super::discovery::DiscoveryPreview;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CapabilityProfile {
    Readable,
    PartiallyReadable,
    FilesOnly,
}

#[derive(Debug, Eq, PartialEq)]
pub struct CapabilityReport {
    pub profile: CapabilityProfile,
    pub document_count: usize,
}

impl CapabilityProfile {
    pub fn validate(profile: Self, fixture: &DiscoveryPreview) -> CapabilityReport {
        let profile = if fixture.documentation_files.is_empty() {
            CapabilityProfile::FilesOnly
        } else {
            profile
        };
        CapabilityReport {
            profile,
            document_count: fixture.documentation_files.len(),
        }
    }
}
