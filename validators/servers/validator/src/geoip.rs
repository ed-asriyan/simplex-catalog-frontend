use std::net::{Ipv4Addr, Ipv6Addr, IpAddr};
use std::net::ToSocketAddrs;
use std::str::FromStr;
use std::error::Error;
use maxminddb;

pub type GeoIpClient = maxminddb::Reader<Vec<u8>>;

fn is_ipv4(ip: &str) -> bool {
    ip.parse::<std::net::Ipv4Addr>().is_ok()
}

fn is_ipv6(ip: &str) -> bool {
    ip.parse::<std::net::Ipv6Addr>().is_ok()
}

fn is_ip_address(ip: &str) -> bool {
    is_ipv4(ip) || is_ipv6(ip)
}

fn resolve(domain: &str) -> Result<IpAddr, Box<dyn Error>> {
    let addrs = (domain, 0).to_socket_addrs()?;
    for addr in addrs {
        return Ok(addr.ip());
    }
    Err("No valid IP address found".into())
}

fn str_to_ip(ip: &str) -> Result<IpAddr, Box<dyn Error>> {
    if is_ipv4(ip) {
        Ok(IpAddr::V4(Ipv4Addr::from_str(ip).unwrap()))
    } else if is_ipv6(ip) {
        Ok(IpAddr::V6(Ipv6Addr::from_str(ip).unwrap()))
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

    pub fn get_country(&self, ip_or_domain: &str) -> Result<String, Box<dyn Error>> {
        if ip_or_domain.ends_with(".onion") {
            return Ok("TOR".to_string());
        }

        let ip: IpAddr = if is_ip_address(&ip_or_domain) {
            str_to_ip(&ip_or_domain)?  
        } else {
            resolve(&ip_or_domain)?
        };
    
        let country: maxminddb::geoip2::Country = self.reader.lookup(ip)?;
        if let Some(country) = country.country {
            match country.iso_code {
                Some(code) => return Ok(code.to_string()),
                None => return Err("No country code found".into())
            }
        } else {
            Err("No country found".into())
        }
    }
}
