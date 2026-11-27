use crate::validator::ports::{RelayCheck, RelayTestPort};

#[allow(dead_code)]
pub struct RelaysChecker {
    smp_server_uri: String,
}

impl RelaysChecker {
    pub fn new(smp_server_uri: String) -> Self {
        Self { smp_server_uri }
    }
}

impl RelayTestPort for RelaysChecker {
    async fn test(&self, _url: &str) -> Option<RelayCheck> {
        todo!()
    }
}
