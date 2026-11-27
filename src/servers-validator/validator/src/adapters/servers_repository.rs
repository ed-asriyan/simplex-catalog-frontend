use crate::validator::ports::{
    Availability, Page, PageOf, Server, ServerRepositoryPort, ServerStatus, ServerType,
};
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

    /// One page of the servers, oldest first, and how many there are in all (PostgREST's `Content-Range`).
    async fn get_servers_rows(&self, page: Page) -> Option<(Vec<ServerRow>, u32)> {
        if page.size == 0 || page.number == 0 {
            return None;
        }
        let low = (page.number as usize - 1).checked_mul(page.size as usize)?;
        let high = low.checked_add(page.size as usize - 1)?;
        let response = self
            .client
            .from("servers")
            .select("uuid,protocol,server_identities(identity),server_hosts(host)")
            .order("created_at.asc,uuid.asc")
            // exact_count() sets the Range header to 0-0 for its own sake: the page's range must come after it.
            .exact_count()
            .range(low, high)
            .execute()
            .await
            .ok()?;
        if !response.status().is_success() {
            return None;
        }
        let total = response
            .headers()
            .get("content-range")?
            .to_str()
            .ok()?
            .rsplit('/')
            .next()?
            .parse::<u32>()
            .ok()?;
        let rows = serde_json::from_str::<Vec<ServerRow>>(&response.text().await.ok()?).ok()?;
        Some((rows, total))
    }

    async fn update_server_status_row(&self, status: &ServerStatusRow) -> Option<()> {
        if self.is_dry {
            info!("Dry run: would update server status {:?}", status);
        } else {
            info!("Updating server status {:?}", status);
            let response = self
                .client
                .from("server_statuses")
                .insert(serde_json::to_string(&[status]).ok()?)
                .execute()
                .await
                .ok()?;
            if !response.status().is_success() {
                return None;
            }
        }
        Some(())
    }
}

impl ServerRepositoryPort for ServersRepository {
    async fn get_servers(&self, page: Page) -> Option<PageOf<Server>> {
        let (rows, total) = self.get_servers_rows(page).await?;
        let items = rows
            .into_iter()
            .filter_map(|row| {
                let type_ = match row.protocol {
                    1 => ServerType::SMP,
                    2 => ServerType::XFTP,
                    _ => return None,
                };
                Some(Server {
                    type_,
                    id: row.uuid,
                    identity: row.server_identities.identity,
                    host: row.server_hosts.host,
                })
            })
            .collect();
        Some(PageOf { items, total })
    }

    async fn update_server_status(&self, server_id: &str, status: &ServerStatus) -> Option<()> {
        self.update_server_status_row(&ServerStatusRow {
            server_uuid: server_id.to_string(),
            status: status.availability == Availability::Online,
            country: status.country.clone(),
            info_page_available: status.info_page_available,
        })
        .await
    }
}
