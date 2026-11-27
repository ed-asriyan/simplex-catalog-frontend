//! The architecture check of the bots validator (design/README.md, rule 7): its application and its ports
//! reach outside only through the ports, so their sources must not use an adapter, the old `smp` and
//! `database` modules, a crate of `Cargo.toml` that reaches outside (the backend's client, the SimpleX client,
//! the runtime, the network), file or network I/O, or the clock.

use std::fs;
use std::path::{Path, PathBuf};

const ROOT: &str = env!("CARGO_MANIFEST_DIR");

/// The dependencies the application and the ports may use: they compute, and reach nothing. Every other
/// dependency of `Cargo.toml` reaches outside (`postgrest`, `simploxide-client`, `tokio`, `clap`, `chrono`…).
const PURE_DEPENDENCIES: &[&str] = &["futures", "log", "rand", "serde", "serde_json", "uuid"];

/// Modules of this crate the application and the ports never name.
const FORBIDDEN_MODULES: &[&str] = &["adapters", "smp", "database"];

/// Paths of the standard library that are I/O, the process or the environment.
const FORBIDDEN_PATHS: &[&str] = &[
    "std::fs",
    "std::net",
    "std::io",
    "std::env",
    "std::process",
    "std::thread",
    "println!",
    "print!",
    "dbg!",
];

/// Names of the clock and of I/O types.
const FORBIDDEN_WORDS: &[&str] = &[
    "Instant",
    "SystemTime",
    "UNIX_EPOCH",
    "File",
    "TcpStream",
    "TcpListener",
    "UdpSocket",
    "now",
];

fn is_word_char(c: char) -> bool {
    c.is_alphanumeric() || c == '_'
}

/// Where `word` stands in `text` as a whole word, not a part of a longer one.
fn contains_word(text: &str, word: &str) -> bool {
    text.match_indices(word).any(|(i, _)| {
        let before = text[..i].chars().next_back();
        let after = text[i + word.len()..].chars().next();
        !before.is_some_and(is_word_char) && !after.is_some_and(is_word_char)
    })
}

/// The source without its comments, so that a comment may say what the code does not do.
fn without_comments(source: &str) -> String {
    source
        .lines()
        .map(|line| line.split("//").next().unwrap_or(""))
        .collect::<Vec<_>>()
        .join("\n")
}

/// The names of the dependencies in `[dependencies]` of a `Cargo.toml`, as Rust spells them.
fn dependencies(cargo_toml: &str) -> Vec<String> {
    let mut in_dependencies = false;
    let mut names = Vec::new();
    for line in cargo_toml.lines() {
        let line = line.trim();
        if line.starts_with('[') {
            in_dependencies = line == "[dependencies]";
        } else if in_dependencies && let Some((name, _)) = line.split_once('=') {
            names.push(name.trim().replace('-', "_"));
        }
    }
    names
}

/// What a source uses that it must not.
fn violations(source: &str, outside_crates: &[String]) -> Vec<String> {
    let code = without_comments(source);
    let mut found = Vec::new();

    for (i, _) in code.match_indices("crate::") {
        let rest = code[i + "crate::".len()..].split(';').next().unwrap_or("");
        for module in FORBIDDEN_MODULES {
            if contains_word(rest, module) {
                found.push(format!("crate::{module}"));
            }
        }
    }
    for path in FORBIDDEN_PATHS {
        if code.contains(path) {
            found.push((*path).to_string());
        }
    }
    for word in FORBIDDEN_WORDS {
        if contains_word(&code, word) {
            found.push((*word).to_string());
        }
    }
    for name in outside_crates {
        let used_as_path = code.match_indices(name.as_str()).any(|(i, _)| {
            let before = code[..i].chars().next_back();
            let after = &code[i + name.len()..];
            !before.is_some_and(is_word_char) && after.starts_with("::")
        });
        if used_as_path || contains_word(&code, &format!("extern crate {name}")) {
            found.push(format!("the crate {name}"));
        }
    }
    found
}

fn rust_files(path: &Path, files: &mut Vec<PathBuf>) {
    if path.is_dir() {
        let mut entries: Vec<_> = fs::read_dir(path)
            .unwrap()
            .map(|e| e.unwrap().path())
            .collect();
        entries.sort();
        for entry in entries {
            rust_files(&entry, files);
        }
    } else if path.extension().is_some_and(|e| e == "rs") {
        files.push(path.to_path_buf());
    }
}

/// The sources the check holds: `app.rs` and what it splits into, without its tests, and `ports.rs` and `ports/`.
fn checked_sources() -> Vec<PathBuf> {
    let validator = Path::new(ROOT).join("src/validator");
    let mut files = Vec::new();
    for part in ["app.rs", "app", "ports.rs", "ports"] {
        let path = validator.join(part);
        if path.exists() {
            rust_files(&path, &mut files);
        }
    }
    files.retain(|f| f.file_name().is_some_and(|n| n != "tests.rs"));
    files
}

fn outside_crates() -> Vec<String> {
    let cargo_toml = fs::read_to_string(Path::new(ROOT).join("Cargo.toml")).unwrap();
    dependencies(&cargo_toml)
        .into_iter()
        .filter(|d| !PURE_DEPENDENCIES.contains(&d.as_str()))
        .collect()
}

#[test]
fn the_application_and_the_ports_reach_outside_only_through_the_ports() {
    let outside = outside_crates();
    let files = checked_sources();
    assert!(
        files.iter().any(|f| f.ends_with("app.rs"))
            && files.iter().any(|f| f.ends_with("outbound.rs")),
        "the check reads the application and the ports, found {files:?}"
    );

    let mut failures = Vec::new();
    for file in files {
        let source = fs::read_to_string(&file).unwrap();
        for found in violations(&source, &outside) {
            failures.push(format!("{}: {found}", file.display()));
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

#[test]
fn the_dependencies_that_reach_outside_are_the_ones_of_cargo_toml() {
    let outside = outside_crates();
    for name in ["postgrest", "simploxide_client", "tokio", "chrono"] {
        assert!(
            outside.iter().any(|d| d == name),
            "{name} is not among {outside:?}"
        );
    }
}

#[test]
fn the_check_finds_what_it_forbids() {
    let outside = outside_crates();
    let bad = [
        "use crate::adapters::Cli;",
        "use crate::smp::test_bot;",
        "use crate::{types::Bot, database::Database};",
        "use postgrest::Postgrest;",
        "let c = simploxide_client::connect();",
        "let t = std::fs::read_to_string(p);",
        "let t = std::net::TcpStream::connect(a);",
        "let t = std::time::Instant::now();",
        "let t = chrono::Utc::now();",
        "tokio::time::sleep(d).await;",
        "println!(\"x\");",
    ];
    for source in bad {
        assert!(
            !violations(source, &outside).is_empty(),
            "not found: {source}"
        );
    }
}

#[test]
fn the_check_lets_through_what_the_application_may_use() {
    let outside = outside_crates();
    let good = "use std::time::Duration;\nuse super::ports::{BotRepositoryPort, Page};\nuse log::info;\nuse rand::seq::SliceRandom;\n// it never calls crate::adapters or the clock\nlet knowledge = 1;";
    assert_eq!(violations(good, &outside), Vec::<String>::new());
}
