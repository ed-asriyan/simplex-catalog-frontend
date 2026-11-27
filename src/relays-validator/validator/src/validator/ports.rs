use chrono::{DateTime, Utc};
use std::future::Future;

#[derive(Debug)]
pub struct RelayStatusSuccess {
    pub name: String,
    pub image: Option<String>,
}

#[derive(Debug)]
pub enum RelayStatus {
    Success(RelayStatusSuccess),
    Failure,
}

pub struct Relay {
    pub url: String,
    pub status: RelayStatus,
    pub last_checked: DateTime<Utc>,
}

pub struct RelayRecord {
    pub id: String,
    pub url: String,
}

pub trait RelayCheckerPort {
    fn check_relay(&self, url: &str) -> impl Future<Output = Option<RelayStatus>>;
}

pub trait RelayRepositoryPort {
    fn get_relays(&self) -> impl Future<Output = Option<Vec<RelayRecord>>>;
    fn update_relay_status(
        &self,
        relay_id: &String,
        status: &RelayStatus,
    ) -> impl Future<Output = Option<()>>;
}
