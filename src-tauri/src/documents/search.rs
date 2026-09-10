use crate::{
    diagnostics::error::XenicsError,
    persistence::{SearchDb, SearchHit},
};

pub struct SearchService<'a> {
    database: &'a SearchDb,
}
impl<'a> SearchService<'a> {
    pub fn new(database: &'a SearchDb) -> Self {
        Self { database }
    }
    pub fn query(&self, query: &str) -> Result<Vec<SearchHit>, XenicsError> {
        let normalized = normalize_query(query);
        if normalized.is_empty() {
            return Ok(Vec::new());
        }
        let location_query = tokenize_query(query)
            .into_iter()
            .next()
            .unwrap_or_default()
            .trim_matches('"')
            .trim_end_matches('*')
            .to_owned();
        self.database
            .query_documents_with_location(&normalized, &location_query)
    }
}
fn normalize_query(query: &str) -> String {
    tokenize_query(query)
        .into_iter()
        .filter_map(|token| {
            let is_phrase = token.starts_with('"') && token.ends_with('"');
            let token = token
                .strip_prefix('"')
                .and_then(|value| value.strip_suffix('"'))
                .unwrap_or(&token);
            let value = token.replace('"', "");
            let (value, is_prefix) = value
                .strip_suffix('*')
                .map_or((value.as_str(), false), |value| (value, !is_phrase));
            if value.is_empty() {
                return None;
            }

            if is_prefix {
                Some(format!("\"{}\"*", value))
            } else {
                Some(format!("\"{}\"", value))
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn tokenize_query(query: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for character in query.chars() {
        match character {
            '"' => {
                in_quotes = !in_quotes;
                current.push(character);
            }
            character if character.is_whitespace() && !in_quotes => {
                if !current.is_empty() {
                    tokens.push(std::mem::take(&mut current));
                }
            }
            character => current.push(character),
        }
    }

    if !current.is_empty() {
        tokens.push(current);
    }
    tokens
}
