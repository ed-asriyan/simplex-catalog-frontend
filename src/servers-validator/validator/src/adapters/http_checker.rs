use crate::{
    adapters::domain_type::{parse_origin, Type},
    validator::ports::HttpCheckerPort,
};
use reqwest;
use std::net::Ipv6Addr;
use std::time::Duration;

fn build_url(scheme: &str, host: &str, port: Option<u16>) -> String {
    // IPv6 literals must be bracketed in URLs (RFC 3986, section 3.2.2)
    let host = if host.parse::<Ipv6Addr>().is_ok() {
        format!("[{host}]")
    } else {
        host.to_string()
    };
    match port {
        Some(p) => format!("{scheme}://{host}:{p}"),
        None => format!("{scheme}://{host}"),
    }
}

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
        let url = build_url(scheme, &host_info.value, host_info.port);

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::adapters::domain_type::parse_origin;

    fn url_for(authority: &str) -> String {
        let h = parse_origin(authority);
        build_url("http", &h.value, h.port)
    }

    #[test]
    fn test_ipv6_url_is_bracketed() {
        assert_eq!(
            url_for("[21e:a51c:885b:7db0:166e:927:98cd:d186]:5223"),
            "http://[21e:a51c:885b:7db0:166e:927:98cd:d186]:5223"
        );
        assert_eq!(url_for("200:abcd::1"), "http://[200:abcd::1]");
        reqwest::Url::parse(&url_for("[200:abcd::1]:443")).unwrap();
    }

    #[test]
    fn test_non_ipv6_url() {
        assert_eq!(url_for("xftp4.asriyan.me:8443"), "http://xftp4.asriyan.me:8443");
        assert_eq!(url_for("smp1.asriyan.ygg"), "http://smp1.asriyan.ygg");
        assert_eq!(url_for("1.2.3.4:80"), "http://1.2.3.4:80");
    }
}
