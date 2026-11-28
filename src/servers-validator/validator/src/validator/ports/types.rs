//! The values the servers validator's ports exchange.

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

/// What one check of a server found (US-B48…US-B50).
#[derive(Debug)]
pub struct ServerStatus {
    /// The location of its host: a country, or Tor, I2P or Yggdrasil; `None` when none is found, and the check
    /// is then not written.
    pub country: Option<String>,
    pub info_page_available: bool,
    pub availability: Availability,
}

/// Whether a server answered its test (US-B48).
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Availability {
    Online,
    Offline,
}

#[derive(Debug)]
pub enum ServerType {
    SMP,
    XFTP,
}

/// A server the catalog lists.
#[derive(Debug)]
pub struct Server {
    pub type_: ServerType,
    pub id: String,
    pub identity: String,
    pub host: String,
}

/// Why a run failed: what it checks could not be read, or a check could not be written.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RunError {
    NotRead,
    NotWritten,
}
