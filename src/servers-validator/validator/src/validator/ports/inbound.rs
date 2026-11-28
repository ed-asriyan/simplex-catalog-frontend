//! How the servers validator is driven: its program runs it once, as its schedule says.

use std::future::Future;

use super::types::RunError;

pub trait ServersValidatorPort {
    /// Reads every page of the servers the backend lists, and checks each, once, in random order, and writes a check of each that can be
    /// written; a server's test is asked once and then again up to `retry_count` times while it fails (US-B48…US-B51).
    /// The answer is an error when the servers could not be read or a check could not be written: the program then ends
    /// with a failure, so that its run is not taken for a success.
    fn check_servers(&self, retry_count: u32) -> impl Future<Output = Result<(), RunError>>;
}
