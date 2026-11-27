//! The architecture check: the application (`app.rs`) and the ports (`ports.rs`, `ports/`) are pure. They do
//! not use the adapters, a crate of `Cargo.toml` that reaches outside the process, file or network I/O, or the
//! clock; everything of those comes in through an outbound port. The sources are read and checked as text.

use std::fs;
use std::path::{Path, PathBuf};

/// The crates of `Cargo.toml` that reach outside: the database client, HTTP, the SimpleX client, and the runtime
/// that gives timers and sockets.
const OUTSIDE_CRATES: &[&str] = &["postgrest", "supabase", "reqwest", "tungstenite", "tokio", "chrono"];

/// Names of the standard library that reach outside: the clock, and the clock's types.
const OUTSIDE_NAMES: &[&str] = &["SystemTime", "Instant", "Utc", "Local"];

/// Paths that reach outside, compared without whitespace: the adapters, files, the network, processes,
/// the environment, standard input and output, the clock.
const OUTSIDE_PATHS: &[&str] = &[
    "crate::adapters",
    "super::adapters",
    "std::fs",
    "std::net",
    "std::io",
    "std::process",
    "std::env",
    "std::time",
    "::now(",
    "println!",
    "eprintln!",
];

fn validator_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("src").join("validator")
}

/// `app.rs`, `ports.rs` and every file under `ports/`.
fn pure_sources() -> Vec<(String, String)> {
    fn collect(dir: &Path, out: &mut Vec<PathBuf>) {
        let mut entries: Vec<PathBuf> = fs::read_dir(dir)
            .expect("the ports directory is readable")
            .map(|entry| entry.expect("a directory entry is readable").path())
            .collect();
        entries.sort();
        for path in entries {
            if path.is_dir() {
                collect(&path, out);
            } else if path.extension().is_some_and(|extension| extension == "rs") {
                out.push(path);
            }
        }
    }

    let root = validator_dir();
    let mut files = vec![root.join("app.rs"), root.join("ports.rs")];
    collect(&root.join("ports"), &mut files);
    files
        .into_iter()
        .map(|path| {
            let source = fs::read_to_string(&path)
                .unwrap_or_else(|error| panic!("{} is readable: {error}", path.display()));
            (path.strip_prefix(&root).unwrap_or(&path).display().to_string(), source)
        })
        .collect()
}

/// Everything of a source but its comments and the `#[cfg(test)]` module declaration's name.
fn code_of(source: &str) -> String {
    source
        .lines()
        .filter(|line| !line.trim_start().starts_with("//"))
        .collect::<Vec<_>>()
        .join("\n")
}

/// What in `source` reaches outside, one text for each.
fn violations(source: &str) -> Vec<String> {
    let code = code_of(source);
    let compact: String = code.chars().filter(|c| !c.is_whitespace()).collect();
    let mut found = Vec::new();

    for word in code.split(|c: char| !(c.is_alphanumeric() || c == '_')) {
        if OUTSIDE_CRATES.contains(&word) {
            found.push(format!("the crate `{word}`"));
        }
        if OUTSIDE_NAMES.contains(&word) {
            found.push(format!("`{word}`"));
        }
    }
    for path in OUTSIDE_PATHS {
        if compact.contains(path) {
            found.push(format!("`{path}`"));
        }
    }
    if compact.contains("std::{") {
        found.push("a grouped `std::{…}` import, which hides what it imports: one path to a `use`".to_string());
    }
    found
}

#[test]
fn the_names_checked_are_the_dependencies_of_cargo_toml() {
    let manifest = fs::read_to_string(Path::new(env!("CARGO_MANIFEST_DIR")).join("Cargo.toml"))
        .expect("Cargo.toml is readable");
    let dependencies = manifest
        .split("[dependencies]")
        .nth(1)
        .expect("Cargo.toml has dependencies")
        .split("\n[")
        .next()
        .unwrap_or_default();
    for name in OUTSIDE_CRATES {
        assert!(
            dependencies.lines().any(|line| line.starts_with(&format!("{name} "))),
            "`{name}` is not a dependency of Cargo.toml: the list of crates that reach outside is out of date"
        );
    }
}

#[test]
fn the_check_finds_what_reaches_outside() {
    for source in [
        "use crate::adapters::relays_repository::RelaysRepository;",
        "use super::adapters::relays_checker::RelaysChecker;",
        "use postgrest::Postgrest;",
        "use reqwest::Client;",
        "use tungstenite::connect;",
        "use tokio::time::sleep;",
        "let text = std :: fs :: read_to_string(\"a\");",
        "let stream = std::net::TcpStream::connect(\"a\");",
        "let now = std::time::SystemTime::now();",
        "let now = chrono::Utc::now();",
        "use std::{fs, io};",
    ] {
        assert!(!violations(source).is_empty(), "`{source}` is not found");
    }
    for source in [
        "// uses crate::adapters and the clock: a comment\nuse std::future::Future;",
        "use rand::seq::SliceRandom;\nlet total = relays.len();",
    ] {
        assert!(violations(source).is_empty(), "`{source}` is found");
    }
}

#[test]
fn the_application_and_the_ports_reach_nothing_outside() {
    let sources = pure_sources();
    assert!(
        sources.len() >= 5,
        "app.rs, ports.rs and the ports are read, not {} files",
        sources.len()
    );
    for (file, source) in sources {
        let found = violations(&source);
        assert!(found.is_empty(), "{file} reaches outside: {}", found.join(", "));
    }
}
