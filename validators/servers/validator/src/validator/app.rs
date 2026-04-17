use super::ports::{
    GeoIpPort, HttpCheckerPort, Server, ServerCheckerPort, ServerRepositoryPort, ServerStatus,
    ServerType,
};
use log::{error, info};
use rand::seq::SliceRandom;

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

    pub async fn check_servers(&self, retry_count: u32) {
        if let Some(mut servers) = self.server_repository.get_servers().await {
            servers.shuffle(&mut rand::rng());
            for server in servers {
                if let Err(e) = self.check_server(&server, retry_count).await {
                    error!("Error checking server {:#?}: {}", server, e);
                }
            }
        } else {
            error!("Failed to retrieve servers from repository");
        }
    }

    async fn check_server(
        &self,
        server: &Server,
        retry_count: u32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let server_uri = get_server_uri(server);
        info!("Checking server status: {}", server_uri);
        let status = {
            let mut attempt = 0;
            let mut result = false;
            while attempt < retry_count && !result {
                result = self
                    .server_checker
                    .check_server(&server_uri)
                    .await
                    .ok_or("Failed to check server")?;
                if !result {
                    attempt += 1;
                    info!(
                        "Server check failed for {}. Retrying... (attempt {}/{})",
                        server_uri, attempt, retry_count
                    );
                }
            }
            result
        };
        info!("Server check result: {:?}", status);

        info!("Getting country information for {}...", server.host);
        let country = self.geoip.get_country(&server.host).await;
        info!("Done: {:?}", country);

        info!("Checking info page availability for {}...", server.host);
        let info_page_available = self.http_checker.is_page_available(&server.host).await;
        info!("Done: {}", info_page_available);

        let result = ServerStatus {
            country,
            info_page_available,
            status,
        };

        self.server_repository
            .update_server_status(&server.id, &result)
            .await;

        Ok(())
    }
}

fn get_server_uri(server: &Server) -> String {
    let schema = match server.type_ {
        ServerType::SMP => "smp",
        ServerType::XFTP => "xftp",
    };
    format!("{}://{}@{}", schema, server.identity, server.host)
}
