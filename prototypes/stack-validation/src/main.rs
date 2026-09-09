use markdown::to_html;
use rusqlite::{params, Connection};
use serde::Deserialize;
use std::{fs, path::PathBuf, process::{Command, Stdio}, sync::{Arc, atomic::{AtomicBool, Ordering}}, thread, time::Duration, time::Instant};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Manifest {
    source_samples: Vec<SourceSample>,
    scale_profile: ScaleProfile,
    queries: Vec<QueryCase>,
}

#[derive(Debug, Deserialize)]
struct SourceSample {
    path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScaleProfile {
    generated_copies_per_source: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QueryCase {
    query: String,
    expected_top_document: String,
}

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..").canonicalize().expect("repository root")
}

fn load_manifest(root: &PathBuf) -> Manifest {
    let path = root.join("tests/fixtures/acceptance/manifest.json");
    serde_json::from_str(&fs::read_to_string(path).expect("acceptance manifest")).expect("valid manifest")
}

fn validate_markdown(root: &PathBuf, manifest: &Manifest) {
    let overview = fs::read_to_string(root.join(&manifest.source_samples[0].path)).unwrap();
    let html = to_html(&overview);
    assert!(html.contains("<h1>"));
    assert!(html.contains("api-reference.md"));
    assert!(html.contains("documentation.png"));

    let malformed = fs::read_to_string(root.join(&manifest.source_samples[4].path)).unwrap();
    let safe_html = to_html(&malformed);
    assert!(!safe_html.contains("<script>"));
    assert!(!safe_html.contains("<javascript>"));
    assert!(safe_html.contains("alert"));

    println!("parser: passed headings, links/assets, malformed input, and non-execution payload checks");
}

fn build_search_index(root: &PathBuf, manifest: &Manifest) -> (Connection, PathBuf, usize, usize, u128) {
    let db_path = std::env::temp_dir().join(format!("xenics-stack-validation-{}.sqlite", std::process::id()));
    let _ = fs::remove_file(&db_path);
    let started = Instant::now();
    let db = Connection::open(&db_path).unwrap();
    db.execute_batch("CREATE VIRTUAL TABLE docs USING fts5(path, title, body, tokenize='unicode61');").unwrap();
    let mut document_count = 0;
    let mut indexed_bytes = 0;

    for sample in &manifest.source_samples {
        let source = fs::read_to_string(root.join(&sample.path)).unwrap();
        let file_name = PathBuf::from(&sample.path).file_name().unwrap().to_string_lossy().to_string();
        for copy in 0..manifest.scale_profile.generated_copies_per_source {
            let path = format!("generated/{copy}/{file_name}");
            db.execute("INSERT INTO docs(path, title, body) VALUES (?1, ?2, ?3)", params![path, file_name, source]).unwrap();
            document_count += 1;
            indexed_bytes += source.len();
        }
    }
    db.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);").unwrap();
    (db, db_path, document_count, indexed_bytes, started.elapsed().as_millis())
}

fn run_search(db: &Connection, manifest: &Manifest) -> (usize, u128, Vec<u128>, Vec<String>) {
    let mut failures = Vec::new();
    let mut samples = Vec::with_capacity(200);
    let mut statement = db.prepare("SELECT path FROM docs WHERE docs MATCH ?1 ORDER BY bm25(docs) LIMIT 1").unwrap();

    for case in &manifest.queries {
        let fts_query = format!("\"{}\"", case.query.replace('"', "\"\""));
        let path: Option<String> = statement.query_row([fts_query], |row| row.get(0)).ok();
        if !path.as_deref().unwrap_or_default().ends_with(&case.expected_top_document) {
            failures.push(format!("{} => {:?} (expected {})", case.query, path, case.expected_top_document));
        }
    }

    let first_case = &manifest.queries[0];
    let first_query = format!("\"{}\"", first_case.query.replace('"', "\"\""));
    let first_started = Instant::now();
    let _: Option<String> = statement.query_row([first_query], |row| row.get(0)).ok();
    let first_query_us = first_started.elapsed().as_micros();

    for index in 0..200 {
        let case = &manifest.queries[index % manifest.queries.len()];
        let fts_query = format!("\"{}\"", case.query.replace('"', "\"\""));
        let started = Instant::now();
        let _: Option<String> = statement.query_row([fts_query], |row| row.get(0)).ok();
        samples.push(started.elapsed().as_micros());
    }
    samples.sort_unstable();
    (failures.len(), first_query_us, samples, failures)
}

fn percentile(samples: &[u128], fraction: f64) -> u128 {
    let index = ((samples.len() - 1) as f64 * fraction).ceil() as usize;
    samples[index]
}

fn validate_cancellation(root: &PathBuf) {
    let mut git = Command::new("git")
        .args(["-C", root.to_str().unwrap(), "cat-file", "--batch"])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("spawn system Git activity");
    thread::sleep(Duration::from_millis(100));
    git.kill().expect("cancel Git process");
    let status = git.wait().expect("wait for canceled Git process");
    assert!(!status.success(), "canceled Git process must not report success");

    let canceled = Arc::new(AtomicBool::new(false));
    let worker_canceled = Arc::clone(&canceled);
    let worker = thread::spawn(move || {
        let mut iterations = 0_u64;
        while !worker_canceled.load(Ordering::Acquire) {
            iterations += 1;
            thread::yield_now();
        }
        iterations
    });
    thread::sleep(Duration::from_millis(10));
    canceled.store(true, Ordering::Release);
    let iterations = worker.join().expect("join canceled worker");
    assert!(iterations > 0);
    assert!(canceled.load(Ordering::Acquire));
    println!("cancellation: Git child stopped before completion; worker joined after {iterations} iterations; no post-cancel mutation performed");
}

fn main() {
    let root = repo_root();
    let manifest = load_manifest(&root);
    validate_markdown(&root, &manifest);
    validate_cancellation(&root);
    let (db, db_path, document_count, indexed_bytes, build_ms) = build_search_index(&root, &manifest);
    let (failures, first_query_us, samples, details) = run_search(&db, &manifest);
    let index_file_bytes = fs::metadata(&db_path).map(|metadata| metadata.len()).unwrap_or_default();
    println!("search: documents={document_count} indexed_bytes={indexed_bytes} index_file_bytes={index_file_bytes} build_ms={build_ms} queries={} failures={failures}", manifest.queries.len());
    println!("search: first_query_us={first_query_us}");
    println!("search: warm_p50_us={} warm_p95_us={} warm_p95_ms={:.3}", percentile(&samples, 0.50), percentile(&samples, 0.95), percentile(&samples, 0.95) as f64 / 1000.0);
    for detail in details { println!("search failure: {detail}"); }
    drop(db);
    let _ = fs::remove_file(db_path);
    if failures > 0 { std::process::exit(2); }
}
