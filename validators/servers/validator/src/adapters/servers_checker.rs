use crate::validator::ports::ServerCheckerPort;
use std::time::Duration;
use tungstenite::{connect, Message};

pub struct ServersChecker {
    smp_server_uri: String,
}

impl ServersChecker {
    pub fn new(smp_server_uri: String) -> Self {
        Self { smp_server_uri }
    }
}

impl ServerCheckerPort for ServersChecker {
    async fn check_server(&self, url: &str) -> Option<bool> {
        let (mut socket, _response) = connect(&self.smp_server_uri).ok()?;
        let corr_id = rand::random::<u32>().to_string();

        let message = serde_json::json!({
            "corrId": corr_id,
            "cmd": format!("/_server test 1 {}", url.trim())
        });

        socket
            .send(Message::Text(message.to_string().into()))
            .ok()?;

        while let Ok(msg) = socket.read() {
            if let Message::Text(text) = msg {
                if let Ok(response) = serde_json::from_str::<serde_json::Value>(&text) {
                    if response["corrId"] == corr_id {
                        let test_result = response["resp"]["type"] == "serverTestResult"
                            && response["resp"]["testFailure"].is_null();
                        return Some(test_result);
                    }
                }
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }

        None
    }
}
