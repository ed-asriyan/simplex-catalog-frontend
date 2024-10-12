use std::error::Error;
use serde::{self, Serialize, Deserialize};
pub use postgrest::Postgrest;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Server {
    pub uuid: String,
    pub uri: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ServerStatus {
    pub server_uuid: String,
    pub status: bool,
    pub country: Option<String>,
    pub info_page_available: bool,
}

pub fn create_client(url: &str, token: &str) -> Postgrest {
    Postgrest::new(url)
        .insert_header("apikey", token)
        .insert_header("Authorization", format!("Bearer {}", token))
}

pub async fn get_all_servers(client: &Postgrest, servers_table_name: &str) -> Result<Vec<Server>, Box<dyn Error>> {
    let response = client
        .from(servers_table_name)
        .select("*")
        .execute()
        .await?
        .text()
        .await?;

    Ok(serde_json::from_str(&response)?)
}

pub async fn add_server_status(client: &Postgrest, servers_status_table_name: &str, status: &ServerStatus) -> Result<(), Box<dyn Error>> {
    client
        .from(servers_status_table_name)
        .insert(serde_json::to_string(&[status])?)
        .execute()
        .await?;
    Ok(())
}

pub async fn delete_server(client: &Postgrest, servers_table_name: &str, uuid: &str) -> Result<(), Box<dyn Error>> {
    client
        .from(servers_table_name)
        .delete()
        .eq("uuid", uuid)
        .execute()
        .await?;
    Ok(())
}
