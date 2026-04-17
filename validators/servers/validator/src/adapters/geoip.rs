use maxminddb;
use std::error::Error;
use std::net::ToSocketAddrs;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::str::FromStr;

use crate::adapters::domain_type::{parse_origin, Type};
use crate::validator::ports::GeoIpPort;

pub type GeoIpClient = maxminddb::Reader<Vec<u8>>;

fn resolve(domain: &str) -> Result<IpAddr, Box<dyn Error>> {
    let mut addrs = (domain, 0).to_socket_addrs()?;
    if let Some(addr) = addrs.next() {
        Ok(addr.ip())
    } else {
        Err("No valid IP address found".into())
    }
}

fn is_ipv4(ip: &str) -> bool {
    ip.parse::<std::net::Ipv4Addr>().is_ok()
}

fn is_ipv6(ip: &str) -> bool {
    ip.parse::<std::net::Ipv6Addr>().is_ok()
}

fn is_ip_address(ip: &str) -> bool {
    is_ipv4(ip) || is_ipv6(ip)
}

fn str_to_ip(ip: &str) -> Result<IpAddr, Box<dyn Error>> {
    if is_ipv4(ip) {
        Ok(IpAddr::V4(Ipv4Addr::from_str(ip)?))
    } else if is_ipv6(ip) {
        Ok(IpAddr::V6(Ipv6Addr::from_str(ip)?))
    } else {
        Err("Invalid IP address".into())
    }
}

pub struct GeoIp {
    reader: GeoIpClient,
}

impl GeoIp {
    pub fn new(path: &str) -> Result<Self, Box<dyn Error>> {
        Ok(Self {
            reader: maxminddb::Reader::open_readfile(path)?,
        })
    }

    fn _get_country(&self, authority: &str) -> Result<String, Box<dyn Error>> {
        let host = parse_origin(authority);

        match host.domain_type {
            Type::Onion => Ok("TOR".to_string()),
            Type::Yggdrasil => Ok("YGGDRASIL".to_string()),
            Type::Clearnet => {
                let ip: IpAddr = if is_ip_address(host.value.as_str()) {
                    str_to_ip(host.value.as_str())?
                } else {
                    resolve(host.value.as_str())?
                };

                let result = self.reader.lookup(ip)?;
                let country: maxminddb::geoip2::Country = result
                    .decode()?
                    .ok_or("Country information could not be found")?;

                match country.country.iso_code {
                    Some(code) => Ok(code.to_string()),
                    None => Err("No country code found".into()),
                }
            }
        }
    }
}

impl GeoIpPort for GeoIp {
    async fn get_country(&self, host: &str) -> Option<String> {
        self._get_country(host).ok()
    }
}
