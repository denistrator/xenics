use super::{DocumentDiscovery, DocumentParser, WarningCode};
use std::{fs, path::Path};
use tempfile::tempdir;

#[test]
fn unsupported_mdx_component_retains_readable_text_without_executing_code() {
    let document = DocumentParser::parse(
        Path::new("unsupported.mdx"),
        b"# Install\n\nInstallation steps\n\n<Component />\n",
    )
    .unwrap();
    assert!(document.reader_text().contains("Installation steps"));
    assert!(document
        .warnings
        .iter()
        .any(|warning| warning.code == WarningCode::UnsupportedComponent));
    assert!(!document.executed_javascript);
}

#[test]
fn rendered_links_and_search_records_share_source_locations() {
    let document = DocumentParser::parse(
        Path::new("links.md"),
        b"# useState [use-state](./state.md)\n",
    )
    .unwrap();
    assert_eq!(
        document.reader_link("./state.md").unwrap().location,
        document.search_heading("useState").unwrap().location
    );
}

#[test]
fn discovery_finds_markdown_and_mdx_but_skips_dependency_folders() {
    let root = tempdir().unwrap();
    fs::write(root.path().join("README.md"), "# docs").unwrap();
    fs::create_dir_all(root.path().join("node_modules/pkg")).unwrap();
    fs::write(root.path().join("node_modules/pkg/ignored.md"), "ignored").unwrap();
    fs::write(root.path().join("guide.mdx"), "guide").unwrap();
    let preview = DocumentDiscovery::preview(root.path());
    assert_eq!(preview.documentation_files.len(), 2);
    assert_eq!(preview.start_page, Some(root.path().join("README.md")));
}

#[test]
fn markdown_ast_preserves_readable_structure_and_inline_text() {
    let document = DocumentParser::parse(
        Path::new("guide.md"),
        b"# Install **Xenics**\n\n- Download the app\n- Open the reader\n\n> Works offline\n",
    )
    .unwrap();

    assert_eq!(document.blocks.len(), 4);
    assert!(document.reader_text().contains("Install Xenics"));
    assert!(document.reader_text().contains("Download the app"));
    assert!(document.reader_text().contains("Works offline"));
}

#[test]
fn markdown_ast_exposes_local_images_as_safe_asset_blocks() {
    let document = DocumentParser::parse(
        Path::new("guide.md"),
        b"![Architecture diagram](./assets/architecture.png)\n",
    )
    .unwrap();

    assert!(matches!(
        document.blocks.first(),
        Some(super::ReaderBlock::Image { alt, url, .. })
            if alt == "Architecture diagram" && url == "./assets/architecture.png"
    ));
}
