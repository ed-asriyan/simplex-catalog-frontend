//! The servers validator's application: reads every page of the servers, tests each once in random order, and
//! writes a check of each (US-B48…US-B50).
//!
//! A check is written only when the server's test was answered and its host has a location; a test that could
//! not be asked is asked again, like one that failed, and writes nothing if it never is.

use super::ports::{
    Availability, GeoIpPort, HttpCheckerPort, Page, Server, ServerCheckerPort,
    ServerRepositoryPort, ServerStatus, ServerType, ServersValidatorPort,
};
use log::{error, info};
use rand::seq::SliceRandom;

/// The servers asked for at once; PostgREST gives 1000 rows at most.
const PAGE_SIZE: u32 = 1000;

pub struct App<R: ServerRepositoryPort, SC: ServerCheckerPort, Geo: GeoIpPort, HC: HttpCheckerPort>
{
    server_repository: R,
    server_checker: SC,
    geoip: Geo,
    http_checker: HC,
}

impl<R: ServerRepositoryPort, SC: ServerCheckerPort, Geo: GeoIpPort, HC: HttpCheckerPort>
    App<R, SC, Geo, HC>
{
    pub fn new(server_repository: R, server_checker: SC, geoip: Geo, http_checker: HC) -> Self {
        Self {
            server_repository,
            server_checker,
            geoip,
            http_checker,
        }
    }

    /// Every server of the catalog; `None` when a page could not be read, so that no list is cut short.
    async fn get_all_servers(&self) -> Option<Vec<Server>> {
        let mut servers = Vec::new();
        let mut number = 1;
        loop {
            let page = self
                .server_repository
                .get_servers(Page {
                    size: PAGE_SIZE,
                    number,
                })
                .await?;
            servers.extend(page.items);
            if u64::from(number) * u64::from(PAGE_SIZE) >= u64::from(page.total) {
                return Some(servers);
            }
            number += 1;
        }
    }

    /// The test's answer: asked once, and again up to `retry_count` times while it is not Online.
    async fn test_server(&self, uri: &str, retry_count: u32) -> Option<Availability> {
        let mut answer = None;
        for attempt in 0..=retry_count {
            if attempt > 0 {
                info!(
                    "Server check failed for {uri}. Retrying... (attempt {attempt}/{retry_count})"
                );
            }
            answer = self.server_checker.check_server(uri).await;
            if answer == Some(Availability::Online) {
                break;
            }
        }
        answer
    }

    async fn check_server(&self, server: &Server, retry_count: u32) {
        let uri = get_server_uri(server);
        info!("Checking server status: {uri}");
        let Some(availability) = self.test_server(&uri, retry_count).await else {
            error!("Could not test server {uri}");
            return;
        };
        info!("Server check result: {availability:?}");

        let country = self.geoip.get_country(&server.host).await;
        let info_page_available = self.http_checker.is_page_available(&server.host).await;
        if country.is_none() {
            error!(
                "No location found for {}; the check is not written",
                server.host
            );
            return;
        }

        let status = ServerStatus {
            country,
            info_page_available,
            availability,
        };
        if self
            .server_repository
            .update_server_status(&server.id, &status)
            .await
            .is_none()
        {
            error!("Could not write the check of server {uri}");
        }
    }
}

impl<R: ServerRepositoryPort, SC: ServerCheckerPort, Geo: GeoIpPort, HC: HttpCheckerPort>
    ServersValidatorPort for App<R, SC, Geo, HC>
{
    async fn check_servers(&self, retry_count: u32) {
        let Some(mut servers) = self.get_all_servers().await else {
            error!("Failed to retrieve servers from repository");
            return;
        };
        servers.shuffle(&mut rand::rng());
        for server in &servers {
            self.check_server(server, retry_count).await;
        }
    }
}

fn get_server_uri(server: &Server) -> String {
    let schema = match server.type_ {
        ServerType::SMP => "smp",
        ServerType::XFTP => "xftp",
    };
    format!("{}://{}@{}", schema, server.identity, server.host)
}

#[cfg(test)]
mod tests;
