//! What implements the bots validator's outbound ports: the SimpleX CLI, over its websocket, and the
//! database, over PostgREST. Every error behind them becomes `None`; none of them panics.

pub mod bots_repository;
pub mod simplex_cli;

pub use bots_repository::BotsRepository;
pub use simplex_cli::SimplexCli;
