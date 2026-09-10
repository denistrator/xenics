use super::model::*;
use markdown::{mdast::Node, to_mdast, ParseOptions};
use std::path::Path;

pub struct DocumentParser;

impl DocumentParser {
    pub fn parse(path: impl AsRef<Path>, bytes: &[u8]) -> Result<ParsedDocument, String> {
        let path = path.as_ref().to_path_buf();
        let text = String::from_utf8(bytes.to_vec())
            .map_err(|_| "document is not valid UTF-8".to_owned())?;
        let tree = to_mdast(&text, &ParseOptions::mdx()).map_err(|error| error.to_string())?;
        let mut document = ParsedDocument {
            path,
            blocks: Vec::new(),
            links: Vec::new(),
            search_records: Vec::new(),
            warnings: Vec::new(),
            executed_javascript: false,
        };
        visit_root(&tree, &mut document);
        Ok(document)
    }
}

fn visit_root(node: &Node, document: &mut ParsedDocument) {
    let Some(children) = node.children() else {
        return;
    };
    for child in children {
        visit_block(child, document);
    }
}

fn visit_block(node: &Node, document: &mut ParsedDocument) {
    let location = source_location(node);
    match node {
        Node::Heading(heading) => {
            let text = inline_text(&heading.children);
            document.blocks.push(ReaderBlock::Heading {
                level: heading.depth,
                text: text.clone(),
                location: location.clone(),
            });
            document.search_records.push(SearchRecord {
                text: heading_search_text(&heading.children, &text),
                location: location.clone(),
            });
            visit_inline_nodes(&heading.children, document, &location);
        }
        Node::Paragraph(paragraph) => {
            if paragraph.children.len() == 1 {
                if let Node::Image(image) = &paragraph.children[0] {
                    document.blocks.push(ReaderBlock::Image {
                        alt: image.alt.clone(),
                        url: image.url.clone(),
                        location,
                    });
                    return;
                }
            }
            let text = inline_text(&paragraph.children);
            if !text.is_empty() {
                document.search_records.push(SearchRecord {
                    text: text.clone(),
                    location: location.clone(),
                });
                document.blocks.push(ReaderBlock::Paragraph {
                    text,
                    location: location.clone(),
                });
            }
            visit_inline_nodes(&paragraph.children, document, &location);
        }
        Node::Code(code) => {
            document.blocks.push(ReaderBlock::Code {
                language: code.lang.clone().unwrap_or_default(),
                text: code.value.clone(),
                location: location.clone(),
            });
            document.search_records.push(SearchRecord {
                text: code.value.clone(),
                location,
            });
        }
        Node::Blockquote(quote) => {
            for child in &quote.children {
                visit_block(child, document);
            }
        }
        Node::List(list) => {
            for item in &list.children {
                visit_block(item, document);
            }
        }
        Node::ListItem(item) => {
            for child in &item.children {
                visit_block(child, document);
            }
        }
        Node::MdxJsxFlowElement(_) | Node::MdxFlowExpression(_) | Node::MdxjsEsm(_) => {
            document.warnings.push(Warning {
                code: WarningCode::UnsupportedComponent,
                message: "unsupported MDX component rendered as text fallback".into(),
                location: Some(location),
            });
        }
        Node::Html(_) => {
            document.warnings.push(Warning {
                code: WarningCode::UnsafeHtml,
                message: "unsafe HTML was omitted".into(),
                location: Some(location),
            });
        }
        _ => {
            if let Some(children) = node.children() {
                for child in children {
                    visit_block(child, document);
                }
            }
        }
    }
}

fn visit_inline_nodes(
    nodes: &[Node],
    document: &mut ParsedDocument,
    parent_location: &SourceLocation,
) {
    for node in nodes {
        match node {
            Node::Link(link) => {
                document.links.push(DocumentLink {
                    label: inline_text(&link.children),
                    target: link.url.clone(),
                    location: parent_location.clone(),
                });
                visit_inline_nodes(&link.children, document, parent_location);
            }
            Node::Image(image) => document.blocks.push(ReaderBlock::Image {
                alt: image.alt.clone(),
                url: image.url.clone(),
                location: source_location(node),
            }),
            Node::MdxJsxTextElement(_) | Node::MdxTextExpression(_) => {
                document.warnings.push(Warning {
                    code: WarningCode::UnsupportedComponent,
                    message: "unsupported MDX component rendered as text fallback".into(),
                    location: Some(source_location(node)),
                });
            }
            Node::Html(_) => document.warnings.push(Warning {
                code: WarningCode::UnsafeHtml,
                message: "unsafe HTML was omitted".into(),
                location: Some(source_location(node)),
            }),
            _ => {
                if let Some(children) = node.children() {
                    visit_inline_nodes(children, document, parent_location);
                }
            }
        }
    }
}

fn inline_text(nodes: &[Node]) -> String {
    nodes
        .iter()
        .filter_map(|node| match node {
            Node::Text(text) => Some(text.value.clone()),
            Node::InlineCode(code) => Some(code.value.clone()),
            Node::Image(image) => Some(image.alt.clone()),
            Node::Break(_) => Some("\n".into()),
            Node::MdxTextExpression(expression) => Some(expression.value.clone()),
            Node::MdxJsxTextElement(element) => Some(inline_text(&element.children)),
            _ => node.children().map(|children| inline_text(children)),
        })
        .collect::<Vec<_>>()
        .join("")
}

fn heading_search_text(nodes: &[Node], fallback: &str) -> String {
    nodes
        .iter()
        .find_map(|node| match node {
            Node::Text(text) => Some(text.value.trim().to_owned()),
            _ => None,
        })
        .filter(|text| !text.is_empty())
        .unwrap_or_else(|| fallback.to_owned())
}

fn source_location(node: &Node) -> SourceLocation {
    node.position()
        .map_or(SourceLocation { line: 1, column: 1 }, |position| {
            SourceLocation {
                line: position.start.line,
                column: position.start.column,
            }
        })
}
