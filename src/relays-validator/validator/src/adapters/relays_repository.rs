use crate::validator::ports::{RelayRecord, RelayRepositoryPort, RelayStatus};
use log::info;
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

    async fn get_relay_records(&self) -> Option<Vec<RelayRow>> {
        let response = self
            .client
            .from("relays")
            .select("*")
            .execute()
            .await
            .ok()?
            .text()
            .await
            .ok()?;

        serde_json::from_str(&response).ok()
    }

    async fn update_relay_profile_row(&self, profile: &RelayProfileRow) -> Option<()> {
        if self.is_dry {
            info!("Dry run: would update relay profile {:?}", profile);
        } else {
            // Here you would implement the actual logic to update the relay profile in your database
            info!("Updating relay profile {:?}", profile);
            self.client
                .from("relay_profiles")
                .upsert(serde_json::to_string(&[profile]).ok()?)
                .on_conflict("relay_uuid")
                .execute()
                .await
                .ok()?;
        }
        Some(())
    }

    async fn update_relay_status_row(&self, status: &RelayStatusRow) -> Option<()> {
        if self.is_dry {
            info!("Dry run: would update relay {:?}", status);
        } else {
            // Here you would implement the actual logic to update the relay status in your database
            info!("Updating relay {:?}", status);
            self.client
                .from("relay_statuses")
                .insert(serde_json::to_string(&[status]).ok()?)
                .execute()
                .await
                .ok()?;
        }
        Some(())
    }
}

impl RelayRepositoryPort for RelaysRepository {
    async fn get_relays(&self) -> Option<Vec<RelayRecord>> {
        let row = self.get_relay_records().await;
        info!(
            "Retrieved {} relays",
            row.as_ref().map(|r| r.len()).unwrap_or(0)
        );
        self.get_relay_records().await.map(|rows| {
            rows.into_iter()
                .map(|row| RelayRecord {
                    id: row.uuid,
                    url: row.url,
                })
                .collect()
        })
    }

    async fn update_relay_status(&self, relay_id: &String, status: &RelayStatus) -> Option<()> {
        if let RelayStatus::Success(profile) = status {
            self.update_relay_profile_row(&RelayProfileRow {
                relay_uuid: relay_id.clone(),
                name: profile.name.clone(),
                photo: profile.image.clone(),
            })
            .await?;
        }

        self.update_relay_status_row(&RelayStatusRow {
            relay_uuid: relay_id.clone(),
            is_online: matches!(status, RelayStatus::Success(_)),
        })
        .await
        .map(|_| ())
    }
}
