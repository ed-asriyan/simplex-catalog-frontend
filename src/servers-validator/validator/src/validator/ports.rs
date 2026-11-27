//! The servers validator's ports: how it is driven (`inbound`), what it needs from outside (`outbound`), and
//! the values they exchange (`types`).

pub mod inbound;
pub mod outbound;
pub mod types;

pub use inbound::*;
pub use outbound::*;
pub use types::*;
