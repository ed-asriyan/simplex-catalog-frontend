//! The bots validator's application: it implements `BotsValidatorPort` over the outbound ports, and reaches
//! outside through them alone (`architecture_tests.rs` holds it to that). It serves US-C22…US-C28.

use std::time::Duration;

use super::ports::{
    BotAddressPort, BotContactPort, BotRepositoryPort, BotsValidatorPort, VisitorPort,
};

// The fields are read by the checks `check_bots` makes, which are not written yet.
#[allow(dead_code)]
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
    async fn check_bots(&self, _retry_count: u32) {
        todo!()
    }
}

#[cfg(test)]
mod tests;
