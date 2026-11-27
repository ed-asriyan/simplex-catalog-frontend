//! The SimpleX CLI the validator is deployed with, over its websocket: `VisitorPort`, `BotAddressPort` and
//! `BotContactPort` at once, as they share one client and the one stream of the CLI's events.
//!
//! The CLI sends every event of every user it holds down that one stream, so a wait reads it and passes by
//! the events of other users, and those of a visitor an earlier check gave up on. A visitor is a new user of
//! the CLI, made the active one, that connects incognito (US-C25).

use std::sync::Arc;
use std::time::Duration;

use futures::StreamExt as _;
use log::{error, warn};
use simploxide_client::{
    prelude::*,
    types::{ChatBotCommand, ConnectionPlan, ContactAddressPlan},
    ws::{Client, EventStream},
};
use tokio::sync::Mutex;

use crate::validator::ports::{
    BotAddress, BotAddressPort, BotCommand, BotContactPort, BotProfile, Connection, Contact,
    FirstMessage, Visitor, VisitorPort,
};

/// One client of the CLI and its events; a clone shares them.
#[derive(Clone)]
pub struct SimplexCli {
    client: Client,
    events: Arc<Mutex<EventStream>>,
}

impl SimplexCli {
    /// Connects to the CLI's websocket at `uri`; `None` when it could not.
    pub async fn connect(uri: &str) -> Option<Self> {
        match simploxide_client::ws::connect(uri).await {
            Ok((client, events)) => Some(Self {
                client,
                events: Arc::new(Mutex::new(events)),
            }),
            Err(e) => {
                error!("Could not connect to the SimpleX CLI at {uri}: {e}");
                None
            }
        }
    }

    /// Reads the events until `pick` picks one, for up to `within`: `Some(None)` when the time ran out,
    /// `None` when the stream ended.
    async fn wait_for<T>(
        &self,
        within: Duration,
        mut pick: impl FnMut(&Event) -> Option<T>,
    ) -> Option<Option<T>> {
        let mut events = self.events.lock().await;
        let wait = async {
            while let Some(event) = events.next().await {
                match event {
                    Ok(event) => {
                        if let Some(picked) = pick(&event) {
                            return Some(picked);
                        }
                    }
                    Err(e) => warn!("An event of the SimpleX CLI could not be read: {e}"),
                }
            }
            error!("The SimpleX CLI's events ended");
            None
        };
        match tokio::time::timeout(within, wait).await {
            Ok(Some(picked)) => Some(Some(picked)),
            Ok(None) => None,
            Err(_) => Some(None),
        }
    }
}

/// The profile in the link data of a contact address; `None` when the plan is not a contact address's or
/// has no link data (US-C26).
fn profile_of(plan: &ConnectionPlan) -> Option<BotProfile> {
    let ConnectionPlan::ContactAddress {
        contact_address_plan:
            ContactAddressPlan::Ok {
                contact_s_link_data: Some(link_data),
                ..
            },
        ..
    } = plan
    else {
        return None;
    };
    let commands = link_data
        .profile
        .preferences
        .as_ref()
        .and_then(|preferences| preferences.commands.as_ref())
        .map(|commands| {
            commands
                .iter()
                .filter_map(|command| match command {
                    ChatBotCommand::Command { label, keyword, .. } => Some(BotCommand {
                        keyword: keyword.clone(),
                        label: label.clone(),
                    }),
                    _ => None,
                })
                .collect()
        })
        .unwrap_or_default();
    Some(BotProfile {
        name: link_data.profile.display_name.clone(),
        description: link_data.profile.short_descr.clone(),
        photo: link_data.profile.image.clone(),
        commands,
    })
}

/// The text of a message the user received in a direct chat, of any kind of message that has one.
fn received_text(event: &Event, user_id: i64) -> Option<String> {
    let Event::NewChatItems(new_items) = event else {
        return None;
    };
    if new_items.user.user_id != user_id {
        return None;
    }
    new_items.chat_items.iter().find_map(|chat_item| {
        let ChatInfo::Direct { .. } = &chat_item.chat_info else {
            return None;
        };
        let CIContent::RcvMsgContent { msg_content, .. } = &chat_item.chat_item.content else {
            return None;
        };
        match msg_content {
            MsgContent::Chat { text, .. }
            | MsgContent::File { text, .. }
            | MsgContent::Text { text, .. }
            | MsgContent::Link { text, .. }
            | MsgContent::Image { text, .. }
            | MsgContent::Video { text, .. }
            | MsgContent::Voice { text, .. }
            | MsgContent::Report { text, .. }
            | MsgContent::Unknown { text, .. } => Some(text.clone()),
            _ => None,
        }
    })
}

impl VisitorPort for SimplexCli {
    async fn new_visitor(&self) -> Option<Visitor> {
        let created = self
            .client
            .create_active_user(
                NewUser::builder()
                    .past_timestamp(false)
                    .user_chat_relay(false)
                    .build(),
            )
            .await;
        match created {
            Ok(created) => Some(Visitor(created.user.user_id)),
            Err(e) => {
                error!("Could not create a user: {e}");
                None
            }
        }
    }
}

impl BotAddressPort for SimplexCli {
    async fn look_up(&self, visitor: Visitor, address: &str) -> Option<BotAddress> {
        let plan = self
            .client
            .api_connect_plan(
                ApiConnectPlan::builder()
                    .connection_link(address.to_string())
                    .user_id(visitor.0)
                    .resolve_known(false)
                    .build(),
            )
            .await;
        match plan {
            Ok(plan) => Some(BotAddress {
                profile: profile_of(&plan.connection_plan),
                link: plan.conn_link.conn_full_link.clone(),
            }),
            Err(e) => {
                error!("Could not look {address} up: {e}");
                None
            }
        }
    }
}

impl BotContactPort for SimplexCli {
    async fn connect(&self, visitor: Visitor, link: &str, within: Duration) -> Option<Connection> {
        let asked = self
            .client
            .api_connect(
                ApiConnect::builder()
                    .prepared_link(CreatedConnLink::builder().conn_full_link(link).build())
                    .user_id(visitor.0)
                    .incognito(true)
                    .build(),
            )
            .await;
        if let Err(e) = asked {
            error!("Could not ask for a contact: {e}");
            return None;
        }
        let connected = self
            .wait_for(within, |event| match event {
                Event::ContactConnected(connected) if connected.user.user_id == visitor.0 => {
                    Some(connected.contact.contact_id)
                }
                _ => None,
            })
            .await?;
        Some(match connected {
            Some(contact_id) => Connection::Accepted(Contact(contact_id)),
            None => Connection::NotAccepted,
        })
    }

    async fn first_message(
        &self,
        visitor: Visitor,
        _contact: Contact,
        within: Duration,
    ) -> Option<FirstMessage> {
        let text = self
            .wait_for(within, |event| received_text(event, visitor.0))
            .await?;
        Some(match text {
            Some(text) => FirstMessage::Wrote(text),
            None => FirstMessage::Silent,
        })
    }

    async fn delete(&self, _visitor: Visitor, contact: Contact) -> Option<()> {
        let deleted = self
            .client
            .api_delete_chat(
                ChatRef::builder()
                    .chat_id(contact.0)
                    .chat_type(ChatType::Direct)
                    .build(),
                ChatDeleteMode::Full {
                    notify: true,
                    undocumented: Default::default(),
                },
            )
            .await;
        match deleted {
            Ok(_) => Some(()),
            Err(e) => {
                error!("Could not delete the contact {}: {e}", contact.0);
                None
            }
        }
    }
}
