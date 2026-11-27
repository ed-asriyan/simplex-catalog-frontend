//! How the servers validator is driven: its program runs it once, as its schedule says.

use std::future::Future;

pub trait ServersValidatorPort {
    /// Reads every page of the servers the backend lists, and checks each, once, in random order, and writes a check of each that can be
    /// written; a server's test is asked again up to `retry_count` times while it fails (US-B48…US-B51).
    fn check_servers(&self, retry_count: u32) -> impl Future<Output = ()>;
}
