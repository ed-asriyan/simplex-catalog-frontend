use super::ports::{RelayCheckerPort, RelayRepositoryPort, RelayStatus};
use log::{error, info};
use rand::seq::SliceRandom;

pub struct App<R: RelayRepositoryPort, C: RelayCheckerPort> {
    relay_repository: R,
    relay_checker: C,
}

impl<R: RelayRepositoryPort, C: RelayCheckerPort> App<R, C> {
    pub fn new(relay_repository: R, relay_checker: C) -> Self {
        Self {
            relay_repository,
            relay_checker,
        }
    }

    pub async fn check_relays(&self, retry_count: u32) {
        if let Some(mut relays) = self.relay_repository.get_relays().await {
            relays.shuffle(&mut rand::rng());
            for relay in relays {
                let mut attempt = 0;
                while attempt < retry_count {
                    if let Some(status) = self.check_relay(&relay.url).await {
                        self.update_relay_status(&relay.id, &status).await;
                        break;
                    }
                    attempt += 1;
                }
            }
        } else {
            error!("Failed to retrieve relays from repository");
        }
    }

    async fn check_relay(&self, url: &str) -> Option<RelayStatus> {
        info!("Checking relay: {}", url);
        let result = self.relay_checker.check_relay(url).await;
        if let Some(status) = &result {
            info!("Relay status: {:?}", status);
        } else {
            error!("Failed to check relay");
        }
        result
    }

    async fn update_relay_status(&self, relay_id: &String, status: &RelayStatus) -> Option<()> {
        info!("Updating relay status for ID: {}", relay_id);
        let result = self
            .relay_repository
            .update_relay_status(relay_id, status)
            .await;
        if result.is_some() {
            info!("Relay status updated successfully");
        } else {
            error!("Failed to update relay status");
        }
        result
    }
}
