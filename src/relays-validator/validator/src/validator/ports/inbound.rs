//! How the relays validator is driven: its program runs it once, as its schedule says.

use std::future::Future;

pub trait RelaysValidatorPort {
    /// Reads every page of the relays the backend lists, and checks each, once, in random order, and writes a check of each; a relay whose
    /// test cannot be asked is asked again up to `retry_count` times, and then not written (US-D22…US-D24).
    fn check_relays(&self, retry_count: u32) -> impl Future<Output = ()>;
}
