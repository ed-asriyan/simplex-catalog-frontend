//! The bots validator's application: it implements `BotsValidatorPort` over the outbound ports, and reaches
//! outside through them alone (`architecture_tests.rs` holds it to that). It serves US-C22…US-C28.
//!
//! What a bot's check finds is what its last try found: a try that could not be made after one that found the
//! bot offline writes nothing, so a check is never written from a try that the outside cut short. The bots are
//! checked in a random order, so that a bot late in the list is not always the one a long run reaches last.

use std::time::Duration;

use log::{error, info, warn};
use rand::seq::SliceRandom;

use super::ports::{
    Bot, BotAddressPort, BotCheck, BotContactPort, BotProfile, BotRepositoryPort,
    BotsValidatorPort, Connection, FirstMessage, Page, RunError, VisitorPort,
};

/// How many bots a page of them holds: PostgREST's own limit on a page.
const PAGE_SIZE: u32 = 1000;

/// What one try of a check of a bot found.
#[derive(Debug)]
struct Found {
    /// The profile its address gave, which is written whatever the check found.
    profile: Option<BotProfile>,
    check: BotCheck,
}

pub struct App<V: VisitorPort, A: BotAddressPort, C: BotContactPort, R: BotRepositoryPort> {
    visitor: V,
    address: A,
    contact: C,
    repository: R,
    /// How long a bot is given to accept a contact, and then to write its first message.
    time_limit: Duration,
}

impl<V: VisitorPort, A: BotAddressPort, C: BotContactPort, R: BotRepositoryPort> App<V, A, C, R> {
    pub fn new(visitor: V, address: A, contact: C, repository: R, time_limit: Duration) -> Self {
        Self {
            visitor,
            address,
            contact,
            repository,
            time_limit,
        }
    }
}

impl<V: VisitorPort, A: BotAddressPort, C: BotContactPort, R: BotRepositoryPort> BotsValidatorPort
    for App<V, A, C, R>
{
    async fn check_bots(&self, retry_count: u32) -> Result<(), RunError> {
        let Some(mut bots) = self.read_bots().await else {
            error!("The bots could not be read");
            return Err(RunError::NotRead);
        };
        info!("Found {} bots", bots.len());
        bots.shuffle(&mut rand::rng());
        let mut result = Ok(());
        for bot in &bots {
            if let Err(error) = self.check_bot(bot, retry_count).await {
                result = Err(error);
            }
        }
        result
    }
}

impl<V: VisitorPort, A: BotAddressPort, C: BotContactPort, R: BotRepositoryPort> App<V, A, C, R> {
    /// Every page of the approved bots, or `None` when one of them could not be read.
    async fn read_bots(&self) -> Option<Vec<Bot>> {
        let mut bots = Vec::new();
        for number in 1.. {
            let page = self
                .repository
                .read_bots(Page {
                    size: PAGE_SIZE,
                    number,
                })
                .await?;
            let read = page.items.len();
            bots.extend(page.items);
            if read == 0 || bots.len() >= page.total as usize {
                break;
            }
        }
        Some(bots)
    }

    /// Tries the bot once, and again up to `retry_count` times while it is not online or the try could not be
    /// made, and writes what the last try found; an error when that could not be written.
    async fn check_bot(&self, bot: &Bot, retry_count: u32) -> Result<(), RunError> {
        let mut found = None;
        for attempt in 1..=retry_count.saturating_add(1) {
            info!("Checking {}, attempt {attempt}", bot.address);
            found = self.try_bot(bot).await;
            match &found {
                Some(Found {
                    check: BotCheck::Online { .. },
                    ..
                }) => break,
                Some(_) => info!("{} is offline", bot.address),
                None => warn!("{} could not be checked", bot.address),
            }
        }
        match found {
            Some(found) => {
                info!("Found: {found:?}");
                if self.write(bot, &found).await.is_none() {
                    error!("The check of {} could not be written", bot.address);
                    return Err(RunError::NotWritten);
                }
            }
            None => error!("No check of {} could be made", bot.address),
        }
        Ok(())
    }

    /// One try of the check, as a new visitor; `None` when a step of it could not be asked.
    async fn try_bot(&self, bot: &Bot) -> Option<Found> {
        let visitor = self.visitor.new_visitor().await?;
        let address = self.address.look_up(visitor, &bot.address).await?;
        let Some(profile) = address.profile else {
            return Some(Found {
                profile: None,
                check: BotCheck::Offline,
            });
        };
        let check = match self
            .contact
            .connect(visitor, &address.link, self.time_limit)
            .await?
        {
            Connection::NotAccepted => BotCheck::Offline,
            Connection::Accepted(contact) => {
                let first_message = self
                    .contact
                    .first_message(visitor, contact, self.time_limit)
                    .await;
                // The contact is deleted even when its first message could not be read.
                let deleted = self.contact.delete(visitor, contact).await;
                let greeting_message = match first_message? {
                    FirstMessage::Wrote(text) => Some(text),
                    FirstMessage::Silent => None,
                };
                deleted?;
                BotCheck::Online { greeting_message }
            }
        };
        Some(Found {
            profile: Some(profile),
            check,
        })
    }

    /// Writes the profile, the greeting and the status, in that order, and stops at the first that could not
    /// be written.
    async fn write(&self, bot: &Bot, found: &Found) -> Option<()> {
        if let Some(profile) = &found.profile {
            self.repository.replace_profile(&bot.id, profile).await?;
        }
        if let BotCheck::Online {
            greeting_message: Some(text),
        } = &found.check
        {
            self.repository
                .replace_greeting_message(&bot.id, text)
                .await?;
        }
        self.repository.create_check(&bot.id, &found.check).await
    }
}

#[cfg(test)]
mod tests;
