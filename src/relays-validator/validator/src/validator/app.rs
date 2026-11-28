//! The relays validator's application: reads every page of the relays, tests each, and writes what the test
//! found (US-D22…US-D24).

use log::{error, info};
use rand::seq::SliceRandom;

use super::ports::{
    Page, Relay, RelayCheck, RelayRepositoryPort, RelayTestPort, RelaysValidatorPort, RunError,
};

/// How many relays one page asks for.
const PAGE_SIZE: u32 = 1000;

pub struct App<R: RelayRepositoryPort, T: RelayTestPort> {
    relay_repository: R,
    relay_test: T,
}

impl<R: RelayRepositoryPort, T: RelayTestPort> App<R, T> {
    pub fn new(relay_repository: R, relay_test: T) -> Self {
        Self {
            relay_repository,
            relay_test,
        }
    }

    /// Every relay of the list, page after page until the list's total is read. `None` when a page could not be
    /// read: a list read in part is not checked as if it were whole.
    async fn read_all_relays(&self) -> Option<Vec<Relay>> {
        let mut relays: Vec<Relay> = Vec::new();
        let mut number = 1;
        loop {
            let page = self
                .relay_repository
                .read_relays(Page { size: PAGE_SIZE, number })
                .await?;
            let is_empty = page.items.is_empty();
            relays.extend(page.items);
            if is_empty || relays.len() >= page.total as usize {
                return Some(relays);
            }
            number += 1;
        }
    }

    async fn test_relay(&self, url: &str, retry_count: u32) -> Option<RelayCheck> {
        for attempt in 0..=retry_count {
            info!("Checking relay: {} (attempt {})", url, attempt + 1);
            if let Some(check) = self.relay_test.test(url).await {
                info!("Relay check: {:?}", check);
                return Some(check);
            }
            error!("Failed to test relay {}", url);
        }
        None
    }

    async fn write_check(&self, relay: &Relay, check: &RelayCheck) -> Result<(), RunError> {
        if let RelayCheck::Online { profile } = check {
            if self
                .relay_repository
                .replace_profile(&relay.id, profile)
                .await
                .is_none()
            {
                error!("Failed to replace the profile of relay {}", relay.id);
                return Err(RunError::NotWritten);
            }
        }
        if self
            .relay_repository
            .create_check(&relay.id, check)
            .await
            .is_none()
        {
            error!("Failed to create the check of relay {}", relay.id);
            return Err(RunError::NotWritten);
        }
        Ok(())
    }
}

impl<R: RelayRepositoryPort, T: RelayTestPort> RelaysValidatorPort for App<R, T> {
    async fn check_relays(&self, retry_count: u32) -> Result<(), RunError> {
        let Some(mut relays) = self.read_all_relays().await else {
            error!("Failed to retrieve relays from repository");
            return Err(RunError::NotRead);
        };
        info!("Retrieved {} relays", relays.len());
        relays.shuffle(&mut rand::rng());
        let mut result = Ok(());
        for relay in &relays {
            if let Some(check) = self.test_relay(&relay.url, retry_count).await {
                if let Err(error) = self.write_check(relay, &check).await {
                    result = Err(error);
                }
            }
        }
        result
    }
}

#[cfg(test)]
mod tests;
