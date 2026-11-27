use super::ports::{
    GeoIpPort, HttpCheckerPort, ServerCheckerPort, ServerRepositoryPort, ServersValidatorPort,
};

#[cfg(test)]
mod tests;

pub struct App<R: ServerRepositoryPort, SC: ServerCheckerPort, Geo: GeoIpPort, HC: HttpCheckerPort>
{
    #[allow(dead_code)] // used by `/implement`
    server_repository: R,
    #[allow(dead_code)]
    server_checker: SC,
    #[allow(dead_code)]
    geoip: Geo,
    #[allow(dead_code)]
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
}

impl<R: ServerRepositoryPort, SC: ServerCheckerPort, Geo: GeoIpPort, HC: HttpCheckerPort>
    ServersValidatorPort for App<R, SC, Geo, HC>
{
    async fn check_servers(&self, _retry_count: u32) {
        todo!()
    }
}
