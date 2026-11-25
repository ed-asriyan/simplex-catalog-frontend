use std::future::Future;

#[derive(Debug)]
pub struct ServerStatus {
    pub country: Option<String>,
    pub info_page_available: bool,
    pub status: bool,
}

#[derive(Debug)]
pub enum ServerType {
    SMP,
    XFTP,
}

#[derive(Debug)]
pub struct Server {
    pub type_: ServerType,
    pub id: String,
    pub identity: String,
    pub host: String,
}

pub trait ServerCheckerPort {
    fn check_server(&self, url: &str) -> impl Future<Output = Option<bool>>;
}

pub trait HttpCheckerPort {
    fn is_page_available(&self, host: &str) -> impl Future<Output = bool>;
}

pub trait GeoIpPort {
    fn get_country(&self, host: &str) -> impl Future<Output = Option<String>>;
}

pub trait ServerRepositoryPort {
    fn get_servers(&self) -> impl Future<Output = Option<Vec<Server>>>;
    fn update_server_status(
        &self,
        server_id: &String,
        status: &ServerStatus,
    ) -> impl Future<Output = Option<()>>;
}
