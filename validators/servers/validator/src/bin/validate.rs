extern crate log;
extern crate chrono;
extern crate env_logger;

use clap::{Arg, ArgAction, parser::ValueSource};
use log::{info, error};
use rand::thread_rng;
use rand::seq::SliceRandom;
use itertools::Itertools;

use validator::{
    create_command,
    init_logger,
    database::{
        Database,
        Server,
        ServerStatus,
    },
    geoip::{
        GeoIp,
    },
    smp::{
        test_server,
        is_info_page_available,
    },
};

struct Args<'a> {
    geoip: &'a GeoIp,
    database: &'a Database<'a>,
    smp_server_uri: &'a str,
    dry: bool,
}

async fn handle_server(
    args: &Args<'_>,
    server: &Server,
) -> Result<(), Box<dyn std::error::Error>> {
    let uri = server.uri();

    info!("Testing {}...", uri);
    let status = test_server(&uri, args.smp_server_uri).await?;
    info!("Done: {}", status);
    
    let domain = if let Some(pos) = server.host.find(':') {
        &server.host[..pos]
    } else {
        &server.host
    };
    let country = match args.geoip.get_country(&domain) {
        Ok(country) => {
            Some(country)
        }
        Err(e) => {
            None
        }
    };
    info!("Done: {:?}", country);

    info!("Checking info page availability...");
    let mut info_page_available = is_info_page_available(&domain).await;
    info!("Done: {}", info_page_available);
    
    info!("Adding server status...");
    if !args.dry {
        args.database.server_statuses_add(&ServerStatus {
            server_uuid: &server.uuid,
            status,
            country: country.as_deref(),
            info_page_available,
        }).await?;
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
        .get_matches();

    let maxmind_db_path = command.get_one::<String>("maxmind-db-path").expect("required argument");
    let smp_client_ws_url = command.get_one::<String>("smp-client-ws-url").expect("required argument");
    let supabase_uri = command.get_one::<String>("supabase-url").expect("required argument");
    let supabase_token = command.get_one::<String>("supabase-key").expect("required argument");
    let servers_table_name = command.get_one::<String>("supabase-servers-table-name").expect("required argument");
    let servers_status_table_name = command.get_one::<String>("supabase-servers-status-table-name").expect("required argument");
    let dry = command.value_source("dry") == Some(ValueSource::CommandLine);

    let args = Args {
        geoip: &GeoIp::new(&maxmind_db_path).unwrap(),
        database: &Database::new(&supabase_uri, &supabase_token, &servers_table_name, &servers_status_table_name),
        smp_server_uri: &smp_client_ws_url,
        dry,
    };

    if args.dry {
        info!("Running in dry mode. No changes will be made to the database.");
    }

    let mut servers = args.database.servers_get_all().await.unwrap();
    servers.shuffle(&mut thread_rng());

    info!("Found {} servers", servers.len());
    for server in servers {
        if let Err(e) = handle_server(&args, &server).await {
            error!("Error: {}", e);
        }
    }
}
