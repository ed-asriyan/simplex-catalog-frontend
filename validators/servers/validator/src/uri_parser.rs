use regex::Regex;

fn extract_hostnames<'a>(input: &'a str) -> impl Iterator<Item = &'a str> {
    let host_part = if let Some(value) = input.split('@').nth(1) {
        value
    } else {
        ""
    };
    host_part.split(',')
}

pub fn parse_uri<'a>(uri: &'a str) -> Result<impl Iterator<Item = &'a str>, Box<dyn std::error::Error>> {
    let uri_type = uri.split(':').next().unwrap_or("").to_string();
    if uri_type != "smp" && uri_type != "xftp" {
        return Err("Invalid SMP/XFTP URI".into())
    }

    Ok(extract_hostnames(uri).filter(|hostname| !is_server_official(hostname)))
}

pub fn is_server_official(uri: &str) -> bool {
    uri.contains("simplex.im")
}
