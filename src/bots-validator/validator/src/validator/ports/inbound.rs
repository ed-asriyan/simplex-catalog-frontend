//! How the bots validator is driven: its program runs it once, as its schedule says.

use std::future::Future;

pub trait BotsValidatorPort {
    /// Reads every page of the approved bots, and checks each, once, in turn, and writes a check of each that could be made; a bot is
    /// checked again up to `retry_count` times while it is not online or its check fails (US-C22…US-C28).
    fn check_bots(&self, retry_count: u32) -> impl Future<Output = ()>;
}
