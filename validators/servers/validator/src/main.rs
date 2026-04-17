extern crate chrono;
extern crate env_logger;
extern crate log;

pub mod adapters;
pub mod validator;

use chrono::Local;
use clap::{parser::ValueSource, value_parser, Arg, ArgAction, Command};
use env_logger::Builder;
use log::{info, LevelFilter};
use std::io::Write;

use crate::adapters::http_checker;

pub fn init_logger() {
    Builder::new()
        .format(|buf, record| {
            writeln!(
                buf,
                "{} [{}] - {}",
                Local::now().format("%Y-%m-%dT%H:%M:%S"),
                record.level(),
                record.args()
            )
        })
        .filter(None, LevelFilter::Info)
        .init();
}

struct Args {
    smp_server_uri: String,
    dry: bool,
    retry_count: u32,
    maxmind_db_path: String,
    supabase_url: String,
    supabase_key: String,
    tor_socks5_proxy: String,
}

fn parse_args() -> Args {
    let command = Command::new("simplex-directory-servers-validator")
        .author("Ed Asriyan")
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
        .arg(
            Arg::new("supabase-url")
                .long("supabase-url")
                .value_name("URL")
                .help("Sets the Supabase URL for the database")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("supabase-key")
                .long("supabase-key")
                .value_name("KEY")
                .help("Sets the Supabase API key for the database")
                .num_args(1)
                .required(true),
        )
        .get_matches();

    let smp_server_uri = command
        .get_one::<String>("smp-client-ws-url")
        .expect("required argument");
    let dry = command.value_source("dry") == Some(ValueSource::CommandLine);
    let retry_count = *command
        .get_one::<u32>("retry-count")
        .expect("required argument");
    let supabase_url = command
        .get_one::<String>("supabase-url")
        .expect("required argument");
    let supabase_key = command
        .get_one::<String>("supabase-key")
        .expect("required argument");
    let maxmind_db_path = command
        .get_one::<String>("maxmind-db-path")
        .expect("required argument");
    let tor_socks5_proxy = command
        .get_one::<String>("tor-socks5-proxy")
        .expect("required argument");

    Args {
        smp_server_uri: smp_server_uri.clone(),
        dry,
        retry_count,
        supabase_url: supabase_url.clone(),
        supabase_key: supabase_key.clone(),
        maxmind_db_path: maxmind_db_path.clone(),
        tor_socks5_proxy: tor_socks5_proxy.clone(),
    }
}

#[tokio::main]
async fn main() {
    init_logger();

    let args = parse_args();

    if args.dry {
        info!("Running in dry mode. No changes will be made to the database.");
    }

    let servers_repository = adapters::servers_repository::ServersRepository::new(
        &args.supabase_url,
        &args.supabase_key,
        args.dry,
    );
    let servers_checker = adapters::servers_checker::ServersChecker::new(args.smp_server_uri);
    let http_checker = http_checker::HttpChecker::new(args.tor_socks5_proxy.clone());
    let geoip =
        adapters::geoip::GeoIp::new(&args.maxmind_db_path).expect("Cannot initialize GeoIP");

    let app = validator::App::new(servers_repository, servers_checker, geoip, http_checker);

    app.check_servers(args.retry_count).await;
}
