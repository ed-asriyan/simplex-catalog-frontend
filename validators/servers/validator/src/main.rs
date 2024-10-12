extern crate log;
extern crate chrono;
extern crate env_logger;

use std::io::Write;
use clap::{Arg, Command};
use chrono::Local;
use env_logger::Builder;
use log::{info, error, LevelFilter};
use rand::thread_rng;
use rand::seq::SliceRandom;

mod database;
mod geoip;
mod smp;
mod uri_parser;

use crate::database::{create_client, get_all_servers, delete_server, add_server_status, Server, ServerStatus, Postgrest};
use crate::geoip::{create_reader, get_country};
use crate::smp::{test_server, is_info_page_available};
use crate::uri_parser::{parse_uri, is_server_official, ServerDomainType};

async fn handle_server(
    reader: &maxminddb::Reader<Vec<u8>>,
    client: &Postgrest,
    smp_server_uri: &str,
    server: &Server,
    servers_table_name: &str,
    servers_status_table_name: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    if is_server_official(&server.uri) {
        info!("Server is official. Deleting...");
        delete_server(client, servers_table_name, &server.uuid).await?;
        info!("Done");
        return Ok(());
    }

    let parsed_uri = parse_uri(&server.uri);
    if let Err(_) = parsed_uri {
        return Err(format!("Invalid URI: {}", server.uri).into());
    }
    let parsed_uri = parsed_uri.unwrap();
    
    info!("Testing {}...", server.uri);
    let status = test_server(&server.uri, smp_server_uri).await?;
    info!("Done: {}", status);
    
    info!("Detecting country...");
    let country: Option<String> = if let ServerDomainType::Dns = parsed_uri.domain_type {
        if let Some(domain) = parsed_uri.info_page_domain {
            match get_country(domain, &reader) {
                Ok(country) => {
                    info!("Done: {}", country);
                    Some(country)
                }
                Err(e) => {
                    error!("Error: {}", e);
                    None
                }
            }
        } else {
            info!("No info page domain found. Skipping country detection.");
            None
        }
    } else {
        info!("Onion domain detected. Skipping country detection.");
        Some("TOR".to_string())
    };

    info!("Checking info page availability...");
    let info_page_available = if let Some(domain) = parsed_uri.info_page_domain {
        let result = is_info_page_available(domain).await;
        info!("Done: {}", result);
        result
    } else {
        info!("No info page domain found. Skipping info page availability detection.");
        false
    };

    info!("Adding server status...");
    add_server_status(client, servers_status_table_name, &ServerStatus {
        server_uuid: server.uuid.clone(),
        status,
        country,
        info_page_available,
    }).await?;
    info!("Done");

    Ok(())
}

#[tokio::main]
async fn main() {
    Builder::new()
        .format(|buf, record| {
            writeln!(buf,
                "{} [{}] - {}",
                Local::now().format("%Y-%m-%dT%H:%M:%S"),
                record.level(),
                record.args()
            )
        })
        .filter(None, LevelFilter::Info)
        .init();

    let matches = Command::new("simplex-servers-registry-validator")
        .version("0.0.1")
        .author("Ed Asriyan <simplex-servers-registry-validator@asriyan.me>")
        .arg(
            Arg::new("maxmind-db-path")
                .long("maxmind-db-path")
                .value_name("FILE")
                .help("Sets the path to the MaxMind database")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("smp-client-ws-url")
                .long("smp-client-ws-url")
                .value_name("URL")
                .help("Sets the SMP client WebSocket URL")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("supabase-url")
                .long("supabase-url")
                .value_name("URL")
                .help("Sets the Supabase URL")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("supabase-key")
                .long("supabase-key")
                .value_name("KEY")
                .help("Sets the Supabase key")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("supabase-servers-table-name")
                .long("supabase-servers-table-name")
                .value_name("KEY")
                .help("Sets the Supabase key")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("supabase-servers-status-table-name")
                .long("supabase-servers-status-table-name")
                .value_name("KEY")
                .help("Sets the Supabase key")
                .num_args(1)
                .required(true),
        )
        .get_matches();

    let maxmind_db_path = matches.get_one::<String>("maxmind-db-path").expect("required argument");
    let smp_client_ws_url = matches.get_one::<String>("smp-client-ws-url").expect("required argument");
    let supabase_uri = matches.get_one::<String>("supabase-url").expect("required argument");
    let supabase_token = matches.get_one::<String>("supabase-key").expect("required argument");
    let servers_table_name = matches.get_one::<String>("supabase-servers-table-name").expect("required argument");
    let servers_status_table_name = matches.get_one::<String>("supabase-servers-status-table-name").expect("required argument");

    let reader = create_reader(&maxmind_db_path).unwrap();
    let client = create_client(&supabase_uri, &supabase_token);

    let mut servers = get_all_servers(&client, servers_table_name).await.unwrap();
    servers.shuffle(&mut thread_rng());

    info!("Found {} servers", servers.len());
    for server in servers {
        if let Err(e) = handle_server(&reader, &client, &smp_client_ws_url, &server, servers_table_name, servers_status_table_name).await {
            error!("Error: {}", e);
        }
    }
}
