//! The values the relays validator's ports exchange.

/// A page of a list: its size, and its number from 1. Every port that gives a list is asked for a page of it
/// and gives `PageOf`, so no list is cut short where nobody sees it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Page {
    pub size: u32,
    pub number: u32,
}

/// One page of a list, and how many the list holds in all.
#[derive(Debug, Clone, PartialEq)]
pub struct PageOf<T> {
    pub items: Vec<T>,
    pub total: u32,
}

/// A relay the catalog lists.
#[derive(Debug, Clone)]
pub struct Relay {
    pub id: String,
    /// The address it was added with.
    pub url: String,
}

/// What a relay answers with when it is tested (US-D22).
#[derive(Debug, Clone, PartialEq)]
pub struct RelayProfile {
    pub name: String,
    /// Its image, as a data URI.
    pub image: Option<String>,
}

/// What one test of a relay found (US-D22, US-D23).
#[derive(Debug, Clone, PartialEq)]
pub enum RelayCheck {
    /// It did not answer as a chat relay.
    Offline,
    /// It answered as a chat relay.
    Online {
        /// What it answered with.
        profile: RelayProfile,
    },
}

/// Why a run failed: what it checks could not be read, or a check could not be written.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RunError {
    NotRead,
    NotWritten,
}
