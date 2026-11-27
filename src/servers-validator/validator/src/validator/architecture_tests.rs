//! The architecture check: the application (`app.rs`) and the ports (`ports/`) must not reach outside. It reads
//! their sources and fails when they use an adapter, a crate that reaches outside (the database client, HTTP, the
//! SimpleX client, GeoIP), file or network I/O, or the clock. Their tests (`app/tests.rs`) are not read.

use std::fs;
use std::path::{Path, PathBuf};

/// Crates of Cargo.toml that reach outside (or the clock, or the program's own setup); the application and the
/// ports may not use them.
const OUTSIDE_CRATES: &[&str] = &[
    "chrono",      // the clock
    "clap",        // the program's arguments
    "env_logger",  // the log's output
    "maxminddb",   // GeoIP
    "postgrest",   // the database client
    "reqwest",     // HTTP
    "supabase",    // the database client
    "tokio",       // I/O, timers
    "tungstenite", // the SimpleX client
];

/// Crates of Cargo.toml that are pure, so the application may use them. A crate added to Cargo.toml is in neither
/// list until someone says which it is.
const PURE_CRATES: &[&str] = &["itertools", "log", "rand", "regex", "serde", "serde_json"];

/// Paths of the standard library that reach outside: files, the network, the process, the clock.
const OUTSIDE_STD: &[&str] = &[
    "std::fs",
    "std::net",
    "std::io",
    "std::process",
    "std::env",
    "std::time",
    "SystemTime",
    "Instant::now",
];

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("src")
}

/// `app.rs` and every file of `ports/`.
fn checked_sources() -> Vec<(String, String)> {
    fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
        for entry in fs::read_dir(dir).expect("readable directory") {
            let path = entry.expect("readable entry").path();
            if path.is_dir() {
                walk(&path, out);
            } else if path.extension().is_some_and(|e| e == "rs") {
                out.push(path);
            }
        }
    }
    let validator = root().join("validator");
    let mut files = vec![validator.join("app.rs"), validator.join("ports.rs")];
    walk(&validator.join("ports"), &mut files);
    files
        .into_iter()
        .map(|path| {
            let text = fs::read_to_string(&path).expect("readable source");
            (path.display().to_string(), text)
        })
        .collect()
}

/// The source without its comments, so a comment may name what the code may not use.
fn code_of(source: &str) -> String {
    source
        .lines()
        .map(|line| line.split("//").next().unwrap_or(""))
        .collect::<Vec<_>>()
        .join("\n")
}

fn uses_crate(code: &str, name: &str) -> bool {
    let name = name.replace('-', "_");
    code.contains(&format!("{name}::"))
        || code.contains(&format!("use {name};"))
        || code.contains(&format!("extern crate {name};"))
}

/// What in the source the application and the ports may not do.
fn violations(path: &str, source: &str) -> Vec<String> {
    let code = code_of(source);
    let mut found = Vec::new();
    if code.contains("crate::adapters")
        || code.contains("super::adapters")
        || code.contains("adapters::")
    {
        found.push(format!("{path} uses an adapter"));
    }
    for name in OUTSIDE_CRATES {
        if uses_crate(&code, name) {
            found.push(format!("{path} uses `{name}`, which reaches outside"));
        }
    }
    for item in OUTSIDE_STD {
        if code.contains(item) {
            found.push(format!("{path} uses `{item}`: I/O or the clock"));
        }
    }
    found
}

fn dependencies() -> Vec<String> {
    let manifest = fs::read_to_string(Path::new(env!("CARGO_MANIFEST_DIR")).join("Cargo.toml"))
        .expect("readable Cargo.toml");
    let mut in_dependencies = false;
    let mut names = Vec::new();
    for line in manifest.lines() {
        let line = line.trim();
        if line.starts_with('[') {
            in_dependencies = line == "[dependencies]";
        } else if in_dependencies {
            if let Some((name, _)) = line.split_once('=') {
                names.push(name.trim().to_string());
            }
        }
    }
    names
}

#[test]
fn application_and_ports_do_not_reach_outside() {
    let sources = checked_sources();
    assert!(
        sources.len() >= 5,
        "app.rs, ports.rs and ports/ are read: {sources:?}"
    );
    let found: Vec<String> = sources
        .iter()
        .flat_map(|(path, source)| violations(path, source))
        .collect();
    assert!(
        found.is_empty(),
        "the application and the ports reach outside:\n{}",
        found.join("\n")
    );
}

// Every crate of Cargo.toml is said to reach outside or not, so one added later cannot slip past the check above.
#[test]
fn every_dependency_is_classified() {
    let unknown: Vec<String> = dependencies()
        .into_iter()
        .filter(|d| !OUTSIDE_CRATES.contains(&d.as_str()) && !PURE_CRATES.contains(&d.as_str()))
        .collect();
    assert!(
        unknown.is_empty(),
        "say in architecture_tests.rs whether these reach outside: {unknown:?}"
    );
}

// The check can fail: it is shown what it must find.
#[test]
fn the_check_finds_what_it_forbids() {
    for bad in [
        "use crate::adapters::geoip::GeoIp;",
        "let c = postgrest::Postgrest::new(url);",
        "let c = reqwest::Client::new();",
        "let s = tungstenite::connect(url);",
        "let g = maxminddb::Reader::open_readfile(p);",
        "let t = chrono::Local::now();",
        "let f = std::fs::read_to_string(p);",
        "let s = std::net::TcpStream::connect(a);",
        "let t = std::time::SystemTime::now();",
        "tokio::time::sleep(d).await;",
    ] {
        assert!(!violations("x.rs", bad).is_empty(), "not found: {bad}");
    }
    assert!(violations("x.rs", "// uses chrono::Local and std::fs\nlet x = 1;").is_empty());
}
