use std::error::Error;
use serde::{self, Serialize, Deserialize};
pub use postgrest::Postgrest;

pub type DatabaseClient = Postgrest;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Server {
    pub uuid: String,
    pub uri: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ServerStatus<'a> {
    pub server_uuid: &'a str,
    pub status: bool,
    pub countries: &'a str,
    pub info_page_available: bool,
}

pub struct Database<'a> {
    client: DatabaseClient,
    servers_table_name: &'a str,
    servers_status_table_name: &'a str,
}

impl<'a> Database<'a> {
    pub fn new(
        url: &str,
        token: &str,
        servers_table_name: &'a str,
        servers_status_table_name: &'a str,
    ) -> Database<'a> {
        let client = Postgrest::new(url)
            .insert_header("apikey", token)
            .insert_header("Authorization", format!("Bearer {}", token));

        Self {
            client,
            servers_table_name,
            servers_status_table_name,
        }
    }

    pub async fn servers_get_all(&self) -> Result<Vec<Server>, Box<dyn Error>> {
        let response = self.client
            .from(self.servers_table_name)
            .select("*")
            .execute()
            .await?
            .text()
            .await?;

        Ok(serde_json::from_str(&response)?)
    }

    pub async fn server_statuses_add(&self, status: &ServerStatus<'_>) -> Result<(), Box<dyn Error>> {
        self.client
            .from(self.servers_status_table_name)
            .insert(serde_json::to_string(&[status])?)
            .execute()
            .await?;
        Ok(())
    }

    pub async fn servers_delete(&self, uuid: &str) -> Result<(), Box<dyn Error>> {
        self.client
            .from(self.servers_table_name)
            .delete()
            .eq("uuid", uuid)
            .execute()
            .await?;
        Ok(())
    }
}
