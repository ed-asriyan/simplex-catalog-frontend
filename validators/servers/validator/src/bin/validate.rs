extern crate chrono;
extern crate env_logger;
extern crate log;

use clap::{parser::ValueSource, value_parser, Arg, ArgAction};
use log::{error, info};
use rand::rng;
use rand::seq::SliceRandom;

use validator::{
    create_command,
    database::{Database, Server, ServerStatus},
    geoip::GeoIp,
    init_logger,
    smp::{is_info_page_available, test_server},
};

struct Args<'a> {
    geoip: &'a GeoIp,
    database: &'a Database<'a>,
    smp_server_uri: &'a str,
    dry: bool,
    retry_count: u32,
    tor_socks5_proxy: &'a str,
}

async fn handle_server(args: &Args<'_>, server: &Server) -> Result<(), Box<dyn std::error::Error>> {
    let uri = server.uri();

    let mut status = false;
    for i in 0..args.retry_count {
        info!("Testing {} (attempt {})...", uri, i + 1);
        if test_server(&uri, args.smp_server_uri).await? {
            status = true;
            break;
        }
    }
    info!("Done: {}", status);

    let domain = if let Some(pos) = server.host.find(':') {
        &server.host[..pos]
    } else {
        &server.host
    };
    let country = args.geoip.get_country(domain).ok();
    info!("Done: {:?}", country);

    info!("Checking info page availability...");
    let info_page_available = is_info_page_available(
        domain,
        if country.as_deref() == Some("TOR") {
            info!("Using Tor SOCKS5 proxy for info page check...");
            Some(args.tor_socks5_proxy)
        } else {
            None
        },
    )
    .await?;
    info!("Done: {}", info_page_available);

    info!("Adding server status...");
    if !args.dry {
        args.database
            .server_statuses_add(&ServerStatus {
                server_uuid: &server.uuid,
                status,
                country: country.as_deref(),
                info_page_available,
            })
            .await?;
    } else {
        info!("Running in dry mode. Skipping status addition.");
    }
    info!("Done");

    Ok(())
}

#[tokio::main]
async fn main() {
    init_logger();

    let command = create_command()
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
            Arg::new("supabase-servers-table-name")
                .long("supabase-servers-table-name")
                .value_name("TABLE_NAME")
                .help("Sets the Supabase key")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("supabase-servers-status-table-name")
                .long("supabase-servers-status-table-name")
                .value_name("TABLE_NAME")
                .help("Sets the Supabase key")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("dry")
                .long("dry")
                .required(false)
                .action(ArgAction::SetTrue)
                .help("Dry run mode. No changes will be made to the database."),
        )
        .arg(
            Arg::new("retry-count")
                .long("retry-count")
                .value_name("COUNT")
                .help("Sets the number of retry attempts")
                .num_args(1)
                .value_parser(value_parser!(u32))
                .required(true),
        )
        .arg(
            Arg::new("tor-socks5-proxy")
                .long("tor-socks5-proxy")
                .value_name("URL")
                .help("Sets the Tor SOCKS5 proxy. Example: socks5h://localhost:9050")
                .num_args(1)
                .required(true),
        )
        .get_matches();

    let maxmind_db_path = command
        .get_one::<String>("maxmind-db-path")
        .expect("required argument");
    let smp_server_uri = command
        .get_one::<String>("smp-client-ws-url")
        .expect("required argument");
    let supabase_uri = command
        .get_one::<String>("supabase-url")
        .expect("required argument");
    let supabase_token = command
        .get_one::<String>("supabase-key")
        .expect("required argument");
    let servers_table_name = command
        .get_one::<String>("supabase-servers-table-name")
        .expect("required argument");
    let servers_status_table_name = command
        .get_one::<String>("supabase-servers-status-table-name")
        .expect("required argument");
    let tor_socks5_proxy = command
        .get_one::<String>("tor-socks5-proxy")
        .expect("required argument");
    let dry = command.value_source("dry") == Some(ValueSource::CommandLine);
    let retry_count = *command
        .get_one::<u32>("retry-count")
        .expect("required argument");

    let args = Args {
        geoip: &GeoIp::new(maxmind_db_path).expect("Cannot initialize GeoIP"),
        database: &Database::new(
            supabase_uri,
            supabase_token,
            servers_table_name,
            servers_status_table_name,
        ),
        smp_server_uri,
        dry,
        retry_count,
        tor_socks5_proxy,
    };

    if args.dry {
        info!("Running in dry mode. No changes will be made to the database.");
    }

    let mut servers = args
        .database
        .servers_get_all()
        .await
        .expect("Cannot fetch servers");
    servers.shuffle(&mut rng());

    info!("Found {} servers", servers.len());
    for server in servers {
        if let Err(e) = handle_server(&args, &server).await {
            error!("Error: {}", e);
        }
    }
}
