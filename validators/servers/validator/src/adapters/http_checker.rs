use crate::{
    adapters::domain_type::{parse_origin, Type},
    validator::ports::HttpCheckerPort,
};
use reqwest;
use std::time::Duration;

pub struct HttpChecker {
    socks5_proxy: String,
}

impl HttpChecker {
    pub fn new(socks5_proxy: String) -> Self {
        Self { socks5_proxy }
    }

    async fn _is_page_available(&self, host: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let host_info = parse_origin(host);

        let is_https = match host_info.domain_type {
            Type::Clearnet => true,
            Type::Onion => false,
            Type::I2p => false,
            Type::Yggdrasil => false,
        };

        let client = reqwest::Client::builder()
            .proxy(reqwest::Proxy::all(&self.socks5_proxy)?)
            .build()?;

        let scheme = if is_https { "https" } else { "http" };
        let url = match host_info.port {
            Some(p) => format!("{scheme}://{}:{}", host_info.value, p),
            None => format!("{scheme}://{}", host_info.value),
        };

        if let Ok(response) = client
            .get(&url)
            .timeout(Duration::from_secs(5))
            .send()
            .await
        {
            if let Ok(text) = response.text().await {
                return Ok(text.to_lowercase().contains("simplex"));
            }
        }
        Ok(false)
    }
}

impl HttpCheckerPort for HttpChecker {
    async fn is_page_available(&self, host: &str) -> bool {
        self._is_page_available(host).await.unwrap_or(false)
    }
}
