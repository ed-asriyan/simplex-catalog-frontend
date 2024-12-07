use regex::Regex;

pub enum ServerDomainType {
    Onion,
    Dns,
}

pub struct Server<'a> {
    pub domain_type: ServerDomainType,
    pub info_page_domain: Option<& 'a str>,
}

fn extract_info_page_domain(input_string: &str) -> Option<&str> {
    let domain_pattern = Regex::new(r"(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9\.]{2,}").unwrap();
    domain_pattern.find(input_string).map(|m| m.as_str())
}

pub fn parse_uri(uri: &str) -> Result<Server, Box<dyn std::error::Error>> {
    let uri_type = uri.split(':').next().unwrap_or("").to_string();
    if uri_type != "smp" && uri_type != "xftp" {
        return Err("Invalid SMP/XFTP URI".into())
    };

    if uri.contains(".onion") {
        if uri.contains(',') {
            Ok(Server {
                domain_type: ServerDomainType::Onion,
                info_page_domain: extract_info_page_domain(uri),
            })
        } else {
            Ok(Server {
                domain_type: ServerDomainType::Onion,
                info_page_domain: None,
            })
        }
    } else {
        Ok(Server {
            domain_type: ServerDomainType::Dns,
            info_page_domain: extract_info_page_domain(uri),
        })
    }
}

pub fn is_server_official(uri: &str) -> bool {
    uri.contains("simplex.im")
}
