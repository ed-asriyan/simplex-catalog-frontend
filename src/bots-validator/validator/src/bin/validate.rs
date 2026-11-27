extern crate chrono;
extern crate env_logger;
extern crate log;

use clap::{Arg, ArgAction, parser::ValueSource, value_parser};
use log::{error, info};
use rand::rng;
use rand::seq::SliceRandom;

use validator::{create_command, database::Database, init_logger, smp::test_bot, types::Bot};

struct Args<'a> {
    database: Database,
    smp_client_ws_uri: &'a str,
    dry: bool,
    retry_count: u32,
    timeout: u64,
}

async fn handle_bot(args: &Args<'_>, bot: &Bot) -> Result<(), Box<dyn std::error::Error>> {
    let test = async || {
        let mut i = args.retry_count;
        loop {
            info!(
                "Checking {}, attempt {}",
                bot.address,
                args.retry_count - i + 1
            );
            match test_bot(&bot.address, args.smp_client_ws_uri, args.timeout).await {
                Ok(r) => {
                    if r.is_online || i == 0 {
                        return Ok(r);
                    } else {
                        if i == 0 {
                            return Ok(r);
                        }
                        i -= 1;
                    }
                }
                Err(e) => {
                    error!("Result: {}", e);
                    if i == 0 {
                        return Err(e);
                    }
                    i -= 1;
                }
            }
        }
    };

    let status = test().await?;
    info!("Done: {:#?}", status);

    info!("Adding bot status...");
    if !args.dry {
        if let Some(profile) = &status.profile {
            args.database.bot_update_profile(&bot.uuid, profile).await?;
        }
        args.database
            .bot_insert_status(&bot.uuid, &status)
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
    let supabase_uri = command
        .get_one::<String>("supabase-url")
        .expect("required argument");
    let supabase_token = command
        .get_one::<String>("supabase-key")
        .expect("required argument");
    let dry = command.value_source("dry") == Some(ValueSource::CommandLine);
    let retry_count = *command
        .get_one::<u32>("retry-count")
        .expect("required argument");
    let timeout = *command
        .get_one::<u64>("timeout")
        .expect("required argument");

    let args = Args {
        database: Database::new(supabase_uri, supabase_token),
        smp_client_ws_uri: smp_client_ws_url,
        dry,
        retry_count,
        timeout,
    };

    if args.dry {
        info!("Running in dry mode. No changes will be made to the database.");
    }

    match args.database.bots_get_all().await {
        Ok(mut bots) => {
            info!("Found {} bots", bots.len());
            bots.shuffle(&mut rng());
            for bot in bots {
                if let Err(e) = handle_bot(&args, &bot).await {
                    error!("Error: {}", e);
                }
            }
        }
        Err(e) => {
            error!("Error fetching bots: {}", e);
            return;
        }
    }
}
