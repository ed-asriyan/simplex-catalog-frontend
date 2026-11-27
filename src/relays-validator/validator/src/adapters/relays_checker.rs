use crate::validator::ports::{RelayCheckerPort, RelayStatus, RelayStatusSuccess};
use std::time::Duration;
use tungstenite::{connect, Message};

pub struct RelaysChecker {
    smp_server_uri: String,
}

impl RelaysChecker {
    pub fn new(smp_server_uri: String) -> Self {
        Self { smp_server_uri }
    }
}

impl RelayCheckerPort for RelaysChecker {
    async fn check_relay(&self, url: &str) -> Option<RelayStatus> {
        let (mut socket, _response) = connect(&self.smp_server_uri).ok()?;
        let corr_id = rand::random::<u32>().to_string();

        let message = serde_json::json!({
            "corrId": corr_id,
            "cmd": format!("/_relay test 1 {}", url.trim())
        });

        socket
            .send(Message::Text(message.to_string().into()))
            .ok()?;

        while let Ok(msg) = socket.read() {
            if let Message::Text(text) = msg {
                if let Ok(response) = serde_json::from_str::<serde_json::Value>(&text) {
                    if response["corrId"] == corr_id {
                        if let Some(relay_profile) = response["resp"]["relayProfile"].as_object() {
                            let name = relay_profile
                                .get("displayName")
                                .and_then(|v| v.as_str().map(|s| s.to_string()))
                                .unwrap_or(String::default());

                            let image: Option<String> = relay_profile
                                .get("image")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string());

                            return Some(RelayStatus::Success(RelayStatusSuccess { name, image }));
                        } else {
                            return Some(RelayStatus::Failure);
                        }
                    }
                }
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }

        None
    }
}
