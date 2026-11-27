use crate::validator::ports::{Page, PageOf, Relay, RelayCheck, RelayProfile, RelayRepositoryPort};
pub use postgrest::Postgrest;
use log::info;
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

    async fn read_page(&self, page: Page) -> Option<PageOf<Relay>> {
        if page.number < 1 || page.size < 1 {
            return None;
        }
        let low = (page.number as usize - 1).checked_mul(page.size as usize)?;
        let high = low.checked_add(page.size as usize - 1)?;
        let response = self
            .client
            .from("relays")
            .select("*")
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
        let rows: Vec<RelayRow> = serde_json::from_str(&response.text().await.ok()?).ok()?;
        info!("Retrieved {} of {} relays", rows.len(), total);
        Some(PageOf {
            items: rows
                .into_iter()
                .map(|row| Relay {
                    id: row.uuid,
                    url: row.url,
                })
                .collect(),
            total,
        })
    }
}

impl RelayRepositoryPort for RelaysRepository {
    async fn read_relays(&self, page: Page) -> Option<PageOf<Relay>> {
        self.read_page(page).await
    }

    async fn replace_profile(&self, relay_id: &str, profile: &RelayProfile) -> Option<()> {
        let row = RelayProfileRow {
            relay_uuid: relay_id.to_string(),
            name: profile.name.clone(),
            photo: profile.image.clone(),
        };
        if self.is_dry {
            info!("Dry run: would update relay profile {:?}", row);
            return Some(());
        }
        info!("Updating relay profile {:?}", row);
        let response = self
            .client
            .from("relay_profiles")
            .upsert(serde_json::to_string(&[&row]).ok()?)
            .on_conflict("relay_uuid")
            .execute()
            .await
            .ok()?;
        response.status().is_success().then_some(())
    }

    async fn create_check(&self, relay_id: &str, check: &RelayCheck) -> Option<()> {
        let row = RelayStatusRow {
            relay_uuid: relay_id.to_string(),
            is_online: matches!(check, RelayCheck::Online { .. }),
        };
        if self.is_dry {
            info!("Dry run: would update relay {:?}", row);
            return Some(());
        }
        info!("Updating relay {:?}", row);
        let response = self
            .client
            .from("relay_statuses")
            .insert(serde_json::to_string(&[&row]).ok()?)
            .execute()
            .await
            .ok()?;
        response.status().is_success().then_some(())
    }
}
