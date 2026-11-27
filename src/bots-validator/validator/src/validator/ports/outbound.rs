//! What the bots validator needs from outside; the adapters implement these. Each is one step of a check, so
//! that the check itself, which steps it takes and what it makes of their answers, is the application's.
//! `None` is always "could not be asked": the check is then not made, and nothing of it is written.

use std::future::Future;
use std::time::Duration;

use super::types::{
    Bot, BotAddress, BotCheck, BotProfile, Connection, Contact, FirstMessage, Page, PageOf, Visitor,
};

pub trait VisitorPort {
    /// A new visitor, which no check before has been made as.
    fn new_visitor(&self) -> impl Future<Output = Option<Visitor>>;
}

pub trait BotAddressPort {
    /// Looks the bot's `address` up, as the visitor, without connecting to it (US-C24, US-C26).
    fn look_up(&self, visitor: Visitor, address: &str) -> impl Future<Output = Option<BotAddress>>;
}

pub trait BotContactPort {
    /// Asks the bot behind `link` for a contact, incognito, as the visitor, and waits up to `within` for it to
    /// accept (US-C25).
    fn connect(
        &self,
        visitor: Visitor,
        link: &str,
        within: Duration,
    ) -> impl Future<Output = Option<Connection>>;

    /// Waits up to `within` for the contact's first message (US-C27).
    fn first_message(
        &self,
        visitor: Visitor,
        contact: Contact,
        within: Duration,
    ) -> impl Future<Output = Option<FirstMessage>>;

    /// Deletes the contact, and tells the bot (US-C25).
    fn delete(&self, visitor: Visitor, contact: Contact) -> impl Future<Output = Option<()>>;
}

pub trait BotRepositoryPort {
    /// The page of the approved bots, by when they were added (US-C22, US-C23).
    fn read_bots(&self, page: Page) -> impl Future<Output = Option<PageOf<Bot>>>;

    /// Puts the profile and its commands in place of the bot's; a command it does not list is the bot's no
    /// more (US-C24).
    fn replace_profile(&self, bot_id: &str, profile: &BotProfile) -> impl Future<Output = Option<()>>;

    /// Puts the message in place of the bot's greeting message (US-C27).
    fn replace_greeting_message(&self, bot_id: &str, text: &str) -> impl Future<Output = Option<()>>;

    /// Adds a status of the bot: online or offline, as the check found it, at the time it is written; its
    /// greeting message is not part of it, and is written by `replace_greeting_message` (US-C25, US-C28).
    fn create_check(&self, bot_id: &str, check: &BotCheck) -> impl Future<Output = Option<()>>;
}
