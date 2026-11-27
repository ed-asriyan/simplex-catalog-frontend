use crate::validator::ports::{Page, PageOf, Relay, RelayCheck, RelayProfile, RelayRepositoryPort};
pub use postgrest::Postgrest;
use serde::{self, Deserialize, Serialize};

pub type DatabaseClient = Postgrest;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelayRow {
    pub uuid: String,
    pub url: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
pub struct RelayStatusRow {
    pub relay_uuid: String,
    pub is_online: bool,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
pub struct RelayProfileRow {
    pub relay_uuid: String,
    pub name: String,
    pub photo: Option<String>,
}

#[allow(dead_code)]
pub struct RelaysRepository {
    client: DatabaseClient,
    is_dry: bool,
}

impl RelaysRepository {
    pub fn new(url: &str, token: &str, is_dry: bool) -> Self {
        let client = Postgrest::new(url)
            .insert_header("apikey", token)
            .insert_header("Authorization", format!("Bearer {}", token));
        Self { is_dry, client }
    }
}

impl RelayRepositoryPort for RelaysRepository {
    async fn read_relays(&self, _page: Page) -> Option<PageOf<Relay>> {
        todo!()
    }

    async fn replace_profile(&self, _relay_id: &str, _profile: &RelayProfile) -> Option<()> {
        todo!()
    }

    async fn create_check(&self, _relay_id: &str, _check: &RelayCheck) -> Option<()> {
        todo!()
    }
}
