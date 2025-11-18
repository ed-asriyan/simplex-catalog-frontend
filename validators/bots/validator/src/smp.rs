use crate::types::{BotCommand, BotProfile};
use core::str;
use futures::TryStreamExt as _;
use simploxide_client::{
    Client, EventStream,
    prelude::*,
    types::{ChatBotCommand, ChatPeerType, ConnectionPlan, ContactAddressPlan, User},
};
use std::error::Error;

fn get_bot_profile(
    connection_plan: ConnectionPlan,
) -> Option<BotProfile<impl IntoIterator<Item = BotCommand>>> {
    match connection_plan {
        ConnectionPlan::ContactAddress {
            contact_address_plan:
                ContactAddressPlan::Ok {
                    contact_s_link_data,
                    ..
                },
            ..
        } => {
            if let Some(link_data) = contact_s_link_data
                && let Some(ChatPeerType::Bot) = link_data.profile.peer_type
            {
                let commands = link_data
                    .profile
                    .preferences
                    .clone()
                    .and_then(|prefs| prefs.commands)
                    .map(|commands| {
                        commands
                            .iter()
                            .filter_map(|x| match x {
                                ChatBotCommand::Command { label, keyword, .. } => {
                                    Some(BotCommand {
                                        keyword: keyword.clone(),
                                        label: label.clone(),
                                    })
                                }
                                _ => None,
                            })
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_else(Vec::new);

                Some(BotProfile {
                    name: link_data.profile.display_name.clone(),
                    description: link_data.profile.short_descr.clone(),
                    photo: link_data.profile.image.clone(),
                    commands,
                })
            } else {
                None
            }
        }
        _ => None,
    }
}

async fn wait_for_message(events: &mut EventStream, user: User) -> Result<String, Box<dyn Error>> {
    while let Some(event) = events.try_next().await? {
        if let Event::NewChatItems(new_msgs) = event.as_ref()
            && new_msgs.user.user_id == user.user_id
        {
            for chat_item in &new_msgs.chat_items {
                if let ChatInfo::Direct { .. } = &chat_item.chat_info
                    && let CIContent::RcvMsgContent { msg_content, .. } =
                        &chat_item.chat_item.content
                {
                    match msg_content {
                        MsgContent::Chat { text, .. }
                        | MsgContent::File { text, .. }
                        | MsgContent::Text { text, .. }
                        | MsgContent::Link { text, .. }
                        | MsgContent::Image { text, .. }
                        | MsgContent::Video { text, .. }
                        | MsgContent::Voice { text, .. }
                        | MsgContent::Report { text, .. }
                        | MsgContent::Unknown { text, .. } => {
                            return Ok(text.clone());
                        }
                        _ => {}
                    }
                }
            }
        }
    }
    Err("Event stream ended unexpectedly without receiving NewChatItems event".into())
}

async fn get_bot_reply_message(
    client: &Client,
    user: &User,
    full_link: &str,
    events: &mut EventStream,
    timeout: u64,
) -> Result<Option<String>, Box<dyn Error>> {
    client
        .api_connect(
            ApiConnect::builder()
                .prepared_link(CreatedConnLink::builder().conn_full_link(full_link).build())
                // .user_id(122)
                .user_id(user.user_id)
                .incognito(true)
                .build(),
        )
        .await?;

    match tokio::time::timeout(
        std::time::Duration::from_secs(timeout),
        wait_for_message(events, user.clone()),
    )
    .await
    {
        Ok(result) => Ok(Some(result?)),
        Err(_) => Ok(None),
    }
}

pub struct BotTestResult<T>
where
    T: IntoIterator<Item = BotCommand>,
{
    pub profile: Option<BotProfile<T>>,
    pub reply_message: Option<String>,
}

pub async fn test_bot(
    uri: &str,
    smp_client_ws_uri: &str,
    timeout: u64,
) -> Result<BotTestResult<impl IntoIterator<Item = BotCommand>>, Box<dyn Error>> {
    let (client, mut events) = simploxide_client::connect(&smp_client_ws_uri).await?;

    let user = client
        .create_active_user(NewUser::builder().past_timestamp(false).build())
        .await?
        .user
        .clone();

    let plan = client
        .api_connect_plan(
            ApiConnectPlan::builder()
                .connection_link(uri.to_string())
                .user_id(user.user_id)
                .build(),
        )
        .await?;

    let profile = get_bot_profile(plan.connection_plan.clone());
    if profile.is_some() {
        Ok(BotTestResult {
            profile,
            reply_message: get_bot_reply_message(
                &client,
                &user,
                &plan.conn_link.conn_full_link,
                &mut events,
                timeout,
            )
            .await?,
        })
    } else {
        Ok(BotTestResult {
            profile: None,
            reply_message: None,
        })
    }
}
