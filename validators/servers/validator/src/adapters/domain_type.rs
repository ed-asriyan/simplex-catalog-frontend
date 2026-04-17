use std::net::{IpAddr, SocketAddr};

pub enum Type {
    Clearnet,
    Onion,
    Yggdrasil,
}

pub struct Host {
    pub domain_type: Type,
    pub value: String,
}

fn is_onion(host: &str) -> bool {
    host.ends_with(".onion")
}

fn is_yggdrasil(ip: &IpAddr) -> bool {
    if let IpAddr::V6(v6) = ip {
        let s = v6.segments()[0];
        s & 0xfe00 == 0x0200
    } else {
        false
    }
}

fn get_host_from_authority(authority: &str) -> &str {
    if authority.starts_with('[') {
        // [ipv6] or [ipv6]:port
        authority
            .find(']')
            .map(|i| &authority[1..i])
            .unwrap_or(authority)
    } else if authority.bytes().filter(|&b| b == b':').count() > 1 {
        // bare IPv6: 2001:db8::1
        authority
    } else {
        // domain, domain:port, or ipv4:port
        authority.split(':').next().unwrap_or(authority)
    }
}

fn get_ip_from_authority(authority: &str) -> Option<IpAddr> {
    // [ipv6]:port or ipv4:port
    if let Ok(sa) = authority.parse::<SocketAddr>() {
        return Some(sa.ip());
    }
    // bare ipv4 or bare ipv6
    if let Ok(ip) = authority.parse::<IpAddr>() {
        return Some(ip);
    }
    // [ipv6] without port
    if authority.starts_with('[') && authority.ends_with(']') {
        return authority[1..authority.len() - 1].parse::<IpAddr>().ok();
    }
    None
}

pub fn parse_origin(authority: &str) -> Host {
    let host = get_host_from_authority(authority);

    if is_onion(host) {
        return Host {
            domain_type: Type::Onion,
            value: host.to_string(),
        };
    }

    if let Some(ip) = get_ip_from_authority(authority) {
        let domain_type = if is_yggdrasil(&ip) {
            Type::Yggdrasil
        } else {
            Type::Clearnet
        };
        return Host {
            domain_type,
            value: ip.to_string(),
        };
    }

    Host {
        domain_type: Type::Clearnet,
        value: host.to_string(),
    }
}
