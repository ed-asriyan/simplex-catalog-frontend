extern crate log;
extern crate chrono;
extern crate env_logger;

use clap::{Arg, Command};
use chrono::Local;
use env_logger::Builder;
use log::LevelFilter;
use std::io::Write;

pub mod database;
pub mod geoip;
pub mod smp;
pub mod uri_parser;

pub fn init_logger() {
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
}

pub fn create_command() -> Command {
    Command::new("simplex-servers-registry-validator")
        .author("Ed Asriyan")
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
}
