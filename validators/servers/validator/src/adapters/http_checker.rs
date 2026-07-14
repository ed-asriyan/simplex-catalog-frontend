use crate::{
    adapters::domain_type::{parse_origin, Type},
    validator::ports::HttpCheckerPort,
};
use reqwest;
use std::time::Duration;

pub struct HttpChecker {
    tor_socks5_proxy: String,
}

impl HttpChecker {
    pub fn new(tor_socks5_proxy: String) -> Self {
        Self { tor_socks5_proxy }
    }

    async fn _is_page_available(&self, host: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let host_info = parse_origin(host);
        let (use_proxy, is_https) = match host_info.domain_type {
            Type::Onion => (true, false),
            Type::Clearnet => (false, true),
            Type::Yggdrasil => (false, false),
        };

        let client = if use_proxy {
            reqwest::Client::builder()
                .proxy(reqwest::Proxy::all(&self.tor_socks5_proxy)?)
                .build()?
        } else {
            reqwest::Client::new()
        };

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
