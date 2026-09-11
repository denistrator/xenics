use super::model::*;
use markdown::{mdast::Node, to_mdast, ParseOptions};
use std::path::Path;

pub struct DocumentParser;

impl DocumentParser {
    pub fn parse(path: impl AsRef<Path>, bytes: &[u8]) -> Result<ParsedDocument, String> {
        let path = path.as_ref().to_path_buf();
        let text = String::from_utf8(bytes.to_vec())
            .map_err(|_| "document is not valid UTF-8".to_owned())?;
        let mut options = ParseOptions::mdx();
        // MDX disables GFM extensions by default; Xenics supports tables while
        // retaining MDX node detection for its non-executable warning path.
        options.constructs.gfm_table = true;
        let tree = to_mdast(&text, &options).map_err(|error| error.to_string())?;
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
                inline: inline_spans(&heading.children),
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
                    inline: inline_spans(&paragraph.children),
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
        Node::Table(table) => {
            let table_rows = table
                .children
                .iter()
                .filter_map(|row| match row {
                    Node::TableRow(row) => Some(table_row_cells(&row.children)),
                    _ => None,
                })
                .collect::<Vec<_>>();
            let headers = table_rows.first().cloned().unwrap_or_default();
            let rows = table_rows.into_iter().skip(1).collect::<Vec<_>>();
            let text = table_text(&headers, &rows);
            if !text.is_empty() {
                document.blocks.push(ReaderBlock::Table {
                    headers,
                    rows,
                    text: text.clone(),
                    location: location.clone(),
                });
                document.search_records.push(SearchRecord {
                    text,
                    location: location.clone(),
                });
            }
            for row in &table.children {
                if let Node::TableRow(row) = row {
                    for cell in &row.children {
                        if let Node::TableCell(cell) = cell {
                            visit_inline_nodes(&cell.children, document, &location);
                        }
                    }
                }
            }
        }
        Node::Blockquote(quote) => {
            let inline = structural_spans(&quote.children);
            let text = inline_span_text(&inline);
            if !text.is_empty() {
                document.blocks.push(ReaderBlock::BlockQuote {
                    text: text.clone(),
                    inline,
                    location: location.clone(),
                });
                document.search_records.push(SearchRecord {
                    text,
                    location: location.clone(),
                });
            }
            visit_structural_children(&quote.children, document, &location);
        }
        Node::List(list) => {
            let items = list
                .children
                .iter()
                .filter_map(|item| match item {
                    Node::ListItem(item) => Some(structural_spans(&item.children)),
                    _ => None,
                })
                .filter(|item| !item.is_empty())
                .collect::<Vec<_>>();
            let text = items
                .iter()
                .map(|item| inline_span_text(item))
                .filter(|item| !item.is_empty())
                .collect::<Vec<_>>()
                .join(" ");
            if !text.is_empty() {
                document.blocks.push(ReaderBlock::List {
                    ordered: list.ordered,
                    items,
                    text: text.clone(),
                    location: location.clone(),
                });
                document.search_records.push(SearchRecord {
                    text,
                    location: location.clone(),
                });
            }
            for item in &list.children {
                if let Node::ListItem(item) = item {
                    visit_structural_children(&item.children, document, &location);
                }
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

fn structural_spans(nodes: &[Node]) -> Vec<InlineSpan> {
    let mut spans = Vec::new();
    for node in nodes {
        let mut next = match node {
            Node::Paragraph(markdown::mdast::Paragraph { children, .. })
            | Node::Heading(markdown::mdast::Heading { children, .. }) => inline_spans(children),
            Node::Code(code) => vec![InlineSpan::InlineCode {
                text: code.value.clone(),
            }],
            Node::List(list) => list
                .children
                .iter()
                .filter_map(|item| match item {
                    Node::ListItem(item) => Some(structural_spans(&item.children)),
                    _ => None,
                })
                .flatten()
                .collect(),
            Node::ListItem(markdown::mdast::ListItem { children, .. })
            | Node::Blockquote(markdown::mdast::Blockquote { children, .. }) => {
                structural_spans(children)
            }
            _ => node
                .children()
                .map(|children| structural_spans(children))
                .unwrap_or_else(|| inline_spans(std::slice::from_ref(node))),
        };
        if !spans.is_empty() && !next.is_empty() {
            spans.push(InlineSpan::Text { text: " ".into() });
        }
        spans.append(&mut next);
    }
    spans
}

fn visit_structural_children(
    nodes: &[Node],
    document: &mut ParsedDocument,
    parent_location: &SourceLocation,
) {
    for node in nodes {
        match node {
            Node::Paragraph(markdown::mdast::Paragraph { children, .. })
            | Node::Heading(markdown::mdast::Heading { children, .. }) => {
                visit_inline_nodes(children, document, parent_location)
            }
            Node::MdxJsxFlowElement(_) | Node::MdxFlowExpression(_) | Node::MdxjsEsm(_) => {
                document.warnings.push(Warning {
                    code: WarningCode::UnsupportedComponent,
                    message: "unsupported MDX component rendered as text fallback".into(),
                    location: Some(source_location(node)),
                });
            }
            _ => {
                if let Some(children) = node.children() {
                    visit_structural_children(children, document, parent_location);
                }
            }
        }
    }
}

fn table_row_cells(nodes: &[Node]) -> Vec<Vec<InlineSpan>> {
    nodes
        .iter()
        .filter_map(|cell| match cell {
            Node::TableCell(cell) => Some(inline_spans(&cell.children)),
            _ => None,
        })
        .collect()
}

fn table_text(headers: &[Vec<InlineSpan>], rows: &[Vec<Vec<InlineSpan>>]) -> String {
    headers
        .iter()
        .chain(rows.iter().flatten())
        .map(|cell| inline_span_text(cell))
        .filter(|cell| !cell.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
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
    inline_span_text(&inline_spans(nodes))
}

fn inline_spans(nodes: &[Node]) -> Vec<InlineSpan> {
    nodes
        .iter()
        .filter_map(|node| match node {
            Node::Text(text) => Some(InlineSpan::Text {
                text: text.value.clone(),
            }),
            Node::InlineCode(code) => Some(InlineSpan::InlineCode {
                text: code.value.clone(),
            }),
            Node::Emphasis(emphasis) => Some(InlineSpan::Emphasis {
                children: inline_spans(&emphasis.children),
            }),
            Node::Strong(strong) => Some(InlineSpan::Strong {
                children: inline_spans(&strong.children),
            }),
            Node::Link(link) => Some(InlineSpan::Link {
                target: link.url.clone(),
                children: inline_spans(&link.children),
            }),
            Node::Image(image) => Some(InlineSpan::Text {
                text: image.alt.clone(),
            }),
            Node::Break(_) => Some(InlineSpan::Text { text: "\n".into() }),
            Node::MdxTextExpression(expression) => Some(InlineSpan::Text {
                text: expression.value.clone(),
            }),
            Node::MdxJsxTextElement(element) => Some(InlineSpan::Text {
                text: inline_text(&element.children),
            }),
            _ => node.children().map(|children| InlineSpan::Text {
                text: inline_text(children),
            }),
        })
        .collect::<Vec<_>>()
}

fn inline_span_text(spans: &[InlineSpan]) -> String {
    spans
        .iter()
        .map(InlineSpan::text)
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
