//! The values the bots validator's ports exchange.

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

/// A bot the catalog lists and the maintainer has approved.
#[derive(Debug, Clone)]
pub struct Bot {
    pub id: String,
    /// The address it was added with.
    pub address: String,
}

/// A command a bot's profile offers (US-C24).
#[derive(Debug, Clone, PartialEq)]
pub struct BotCommand {
    pub keyword: String,
    pub label: String,
}

/// What a bot's address says of it (US-C24).
#[derive(Debug, Clone, PartialEq)]
pub struct BotProfile {
    pub name: String,
    pub description: Option<String>,
    /// Its image, as a data URI.
    pub photo: Option<String>,
    pub commands: Vec<BotCommand>,
}

/// A one-off identity on the SimpleX network that one check of a bot is made as, and that connects incognito,
/// so that a bot never sees two checks as the same contact (US-C25).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Visitor(pub i64);

/// What a bot's address gives when it is looked up (US-C24, US-C26).
#[derive(Debug, Clone, PartialEq)]
pub struct BotAddress {
    /// The profile in the address's link data; `None` when it has none.
    pub profile: Option<BotProfile>,
    /// The link a contact is asked through.
    pub link: String,
}

/// A bot that accepted a visitor as a contact.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Contact(pub i64);

/// What a bot did with a visitor's asking for a contact, within the time limit (US-C25).
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Connection {
    Accepted(Contact),
    NotAccepted,
}

/// What a bot wrote first to a visitor it accepted, within the time limit (US-C27).
#[derive(Debug, Clone, PartialEq)]
pub enum FirstMessage {
    /// Its text.
    Wrote(String),
    Silent,
}

/// What one check of a bot found (US-C25, US-C27).
#[derive(Debug, Clone, PartialEq)]
pub enum BotCheck {
    /// It did not accept the contact within the time limit, or its address gives no profile.
    Offline,
    /// It accepted the contact within the time limit.
    Online {
        /// What it wrote first after accepting the contact, within the time limit; `None` when it wrote nothing.
        greeting_message: Option<String>,
    },
}

/// Why a run failed: what it checks could not be read, or a check could not be written.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RunError {
    NotRead,
    NotWritten,
}
