//! The relays validator's application: reads every page of the relays, tests each, and writes what the test
//! found (US-D22…US-D24).

use super::ports::{RelayRepositoryPort, RelayTestPort, RelaysValidatorPort};

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
}

impl<R: RelayRepositoryPort, T: RelayTestPort> RelaysValidatorPort for App<R, T> {
    async fn check_relays(&self, _retry_count: u32) {
        let _ = (&self.relay_repository, &self.relay_test);
        todo!()
    }
}

#[cfg(test)]
mod tests;
