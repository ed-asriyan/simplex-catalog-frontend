use crate::validator::ports::{Availability, ServerCheckerPort};

pub struct ServersChecker {
    #[allow(dead_code)] // used by `/implement`
    smp_server_uri: String,
}

impl ServersChecker {
    pub fn new(smp_server_uri: String) -> Self {
        Self { smp_server_uri }
    }
}

impl ServerCheckerPort for ServersChecker {
    async fn check_server(&self, _url: &str) -> Option<Availability> {
        todo!()
    }
}
