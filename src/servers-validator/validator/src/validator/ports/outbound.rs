//! What the servers validator needs from outside; the adapters implement these.

use std::future::Future;

use super::types::{Availability, Page, PageOf, Server, ServerStatus};

pub trait ServerCheckerPort {
    /// Tests the server at `url` over the SimpleX network; `None` when it could not be asked (US-B48).
    fn check_server(&self, url: &str) -> impl Future<Output = Option<Availability>>;
}

pub trait HttpCheckerPort {
    /// Whether the host answers with a page that mentions SimpleX (US-B50).
    fn is_page_available(&self, host: &str) -> impl Future<Output = bool>;
}

pub trait GeoIpPort {
    /// The location of the host; `None` when none is found (US-B49).
    fn get_country(&self, host: &str) -> impl Future<Output = Option<String>>;
}

pub trait ServerRepositoryPort {
    /// The page of the servers the catalog lists, by when they were added; `None` when the backend cannot be read.
    fn get_servers(&self, page: Page) -> impl Future<Output = Option<PageOf<Server>>>;

    /// Writes a check of the server; `None` when the backend did not take it.
    fn update_server_status(
        &self,
        server_id: &str,
        status: &ServerStatus,
    ) -> impl Future<Output = Option<()>>;
}
