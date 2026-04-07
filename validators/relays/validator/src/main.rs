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

// extern crate chrono;
// extern crate env_logger;
// extern crate log;

struct Args {
    smp_server_uri: String,
    dry: bool,
    retry_count: u32,
    supabase_url: String,
    supabase_key: String,
}

fn parse_args() -> Args {
    let command = Command::new("simplex-directory-relays-validator")
        .author("Ed Asriyan")
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
                .help("Sets the Supabase API key")
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
    Args {
        smp_server_uri: smp_server_uri.clone(),
        dry,
        retry_count,
        supabase_url: supabase_url.clone(),
        supabase_key: supabase_key.clone(),
    }
}

#[tokio::main]
async fn main() {
    init_logger();

    let args = parse_args();

    if args.dry {
        info!("Running in dry mode. No changes will be made to the database.");
    }

    let relay_repository = adapters::relays_repository::RelaysRepository::new(
        &args.supabase_url,
        &args.supabase_key,
        args.dry,
    );
    let relay_checker = adapters::relays_checker::RelaysChecker::new(args.smp_server_uri);
    let app = validator::App::new(relay_repository, relay_checker);

    app.check_relays(args.retry_count).await;
}
