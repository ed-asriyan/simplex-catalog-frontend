//! What the relays validator needs from outside; the adapters implement these. `None` is always "could not be
//! asked": the check is then not made, and nothing of it is written.

use std::future::Future;

use super::types::{Page, PageOf, Relay, RelayCheck, RelayProfile};

pub trait RelayTestPort {
    /// Tests the relay at `url` over the SimpleX network (US-D22, US-D23).
    fn test(&self, url: &str) -> impl Future<Output = Option<RelayCheck>>;
}

pub trait RelayRepositoryPort {
    /// The page of the relays the catalog lists, by when they were added.
    fn read_relays(&self, page: Page) -> impl Future<Output = Option<PageOf<Relay>>>;

    /// Puts the profile in place of the relay's (US-D22).
    fn replace_profile(&self, relay_id: &str, profile: &RelayProfile) -> impl Future<Output = Option<()>>;

    /// Adds a status of the relay: online or offline, as the check found it, at the time it is written; the
    /// profile is not part of it, and is written by `replace_profile` (US-D24).
    fn create_check(&self, relay_id: &str, check: &RelayCheck) -> impl Future<Output = Option<()>>;
}
