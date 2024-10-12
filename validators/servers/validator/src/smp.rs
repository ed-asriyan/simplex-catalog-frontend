use std::error::Error;
use std::time::Duration;
use tungstenite::{connect, Message};
use reqwest;

pub async fn test_server(uri: &str, smp_client_ws_uri:&str) -> Result<bool, Box<dyn Error>> {
    let (mut socket, _response) = connect(smp_client_ws_uri)?;
    let corr_id = rand::random::<u32>().to_string();

    let message = serde_json::json!({
        "corrId": corr_id,
        "cmd": format!("/_server test 1 {}", uri.trim())
    });

    socket.write_message(Message::Text(message.to_string()))?;

    while let Ok(msg) = socket.read_message() {
        if let Message::Text(text) = msg {
            if let Ok(response) = serde_json::from_str::<serde_json::Value>(&text) {
                if response["corrId"] == corr_id {
                    let test_result = response["resp"]["type"] == "serverTestResult" && response["resp"]["testFailure"].is_null();
                    return Ok(test_result);
                }
            }
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }

    Ok(false)
}

pub async fn is_info_page_available(domain: &str) -> bool {
    let url = format!("https://{}", domain);

    let client = reqwest::Client::new();
    match client.get(&url).timeout(Duration::from_secs(5)).send().await {
        Ok(response) => {
            if let Ok(text) = response.text().await {
                return text.to_lowercase().contains("simplex");
            }
        }
        Err(_) => {
            return false;
        }
    }
    false
}
