use crate::validator::ports::{Server, ServerRepositoryPort, ServerStatus, ServerType};
use log::info;
pub use postgrest::Postgrest;
use serde::{self, Deserialize, Serialize};

pub type DatabaseClient = Postgrest;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
struct HostRow {
    pub host: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
struct IdentityRow {
    pub identity: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
struct ServerRow {
    pub uuid: String,
    pub protocol: i64,
    pub server_identities: IdentityRow,
    pub server_hosts: HostRow,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "snake_case")]
struct ServerStatusRow {
    pub server_uuid: String,
    pub status: bool,
    pub country: Option<String>,
    pub info_page_available: bool,
}

pub struct ServersRepository {
    client: DatabaseClient,
    is_dry: bool,
}

impl ServersRepository {
    pub fn new(url: &str, token: &str, is_dry: bool) -> Self {
        let client = Postgrest::new(url)
            .insert_header("apikey", token)
            .insert_header("Authorization", format!("Bearer {}", token));
        Self { is_dry, client }
    }

    async fn get_servers_rows(&self) -> Option<Vec<ServerRow>> {
        let response = self
            .client
            .from("servers")
            .select("uuid,protocol,server_identities(identity),server_hosts(host)")
            .execute()
            .await
            .ok()?
            .text()
            .await
            .ok()?;

        serde_json::from_str::<Vec<ServerRow>>(&response).ok()
    }

    async fn update_server_status_row(&self, status: &ServerStatusRow) -> Option<()> {
        if self.is_dry {
            info!("Dry run: would update server status {:?}", status);
        } else {
            // Here you would implement the actual logic to update the server status in your database
            info!("Updating server status {:?}", status);
            self.client
                .from("server_statuses")
                .insert(serde_json::to_string(&[status]).ok()?)
                .execute()
                .await
                .ok()?;
        }
        Some(())
    }
}

impl ServerRepositoryPort for ServersRepository {
    async fn get_servers(&self) -> Option<Vec<Server>> {
        Some(
            self.get_servers_rows()
                .await?
                .iter()
                .filter_map(|row| {
                    let type_ = match row.protocol {
                        1 => ServerType::SMP,
                        2 => ServerType::XFTP,
                        _ => return None,
                    };

                    Some(Server {
                        type_,
                        id: row.uuid.clone(),
                        identity: row.server_identities.identity.clone(),
                        host: row.server_hosts.host.clone(),
                    })
                })
                .collect(),
        )
    }

    async fn update_server_status(&self, server_id: &String, status: &ServerStatus) -> Option<()> {
        let status_row = ServerStatusRow {
            server_uuid: server_id.clone(),
            status: status.status,
            country: status.country.clone(),
            info_page_available: status.info_page_available,
        };
        self.update_server_status_row(&status_row).await?;
        Some(())
    }
}
