//! The bots validator's program: it reads its arguments, makes the adapters and the application, and checks
//! the bots once. The GitHub workflow, the Dockerfile and the end-to-end harness run it with these arguments.

use std::time::Duration;

use clap::{Arg, ArgAction, parser::ValueSource, value_parser};
use log::{error, info};

use validator::adapters::{BotsRepository, SimplexCli};
use validator::validator::app::App;
use validator::validator::ports::BotsValidatorPort;
use validator::{create_command, init_logger};

#[tokio::main]
async fn main() {
    init_logger();

    let command = create_command()
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
            Arg::new("timeout")
                .long("timeout")
                .value_name("TIMEOUT")
                .help("Sets the timeout in seconds for waiting for the bot's first message")
                .num_args(1)
                .value_parser(value_parser!(u64))
                .required(true),
        )
        .get_matches();

    let smp_client_ws_url = command
        .get_one::<String>("smp-client-ws-url")
        .expect("required argument");
    let supabase_url = command
        .get_one::<String>("supabase-url")
        .expect("required argument");
    let supabase_key = command
        .get_one::<String>("supabase-key")
        .expect("required argument");
    let dry = command.value_source("dry") == Some(ValueSource::CommandLine);
    let retry_count = *command
        .get_one::<u32>("retry-count")
        .expect("required argument");
    let timeout = *command
        .get_one::<u64>("timeout")
        .expect("required argument");

    if dry {
        info!("Running in dry mode. No changes will be made to the database.");
    }

    let Some(cli) = SimplexCli::connect(smp_client_ws_url).await else {
        error!("No bot can be checked without the SimpleX CLI");
        std::process::exit(1);
    };
    let repository = BotsRepository::new(supabase_url, supabase_key, dry);
    let app = App::new(
        cli.clone(),
        cli.clone(),
        cli,
        repository,
        Duration::from_secs(timeout),
    );

    if app.check_bots(retry_count).await.is_err() {
        std::process::exit(1);
    }
}
