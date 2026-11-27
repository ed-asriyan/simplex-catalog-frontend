//! The database, over PostgREST with the secret key: `BotRepositoryPort`. In a dry run it reads, and writes
//! nothing.
//!
//! PostgREST gives a page by `Range` and how many rows there are in all in `Content-Range`, when asked for
//! the exact count; an error is an answer of its own, with a status that is not a success, which is `None`
//! here. A status is only ever inserted: no role may change or delete one (design rule 3).

use log::{error, info};
use postgrest::Postgrest;
use serde::{Deserialize, Serialize};

use crate::validator::ports::{
    Bot, BotCheck, BotCommand, BotProfile, BotRepositoryPort, Page, PageOf,
};

#[derive(Deserialize)]
struct BotRow {
    uuid: String,
    address: String,
}

#[derive(Serialize)]
struct BotProfileRow<'a> {
    bot_uuid: &'a str,
    name: &'a str,
    description: Option<&'a str>,
    photo: Option<&'a str>,
}

#[derive(Serialize)]
struct BotCommandRow<'a> {
    bot_profile_uuid: &'a str,
    keyword: &'a str,
    label: &'a str,
}

#[derive(Serialize)]
struct BotGreetingMessageRow<'a> {
    bot_uuid: &'a str,
    text: &'a str,
}

#[derive(Serialize)]
struct BotStatusRow<'a> {
    bot_uuid: &'a str,
    is_online: bool,
}

/// The id of a row PostgREST gave back.
#[derive(Deserialize)]
struct Inserted {
    uuid: String,
}

pub struct BotsRepository {
    client: Postgrest,
    is_dry: bool,
}

/// What a request gave: its `Content-Range` and its body, or the error behind it, as text.
type Answer = Result<(Option<String>, String), String>;

impl BotsRepository {
    pub fn new(url: &str, token: &str, is_dry: bool) -> Self {
        let client = Postgrest::new(url)
            .insert_header("apikey", token)
            .insert_header("Authorization", format!("Bearer {token}"));
        Self { client, is_dry }
    }

    /// Sends the request, and gives its `Content-Range` and its body, if it succeeded.
    async fn send(builder: postgrest::Builder) -> Answer {
        let response = builder.execute().await.map_err(|e| e.to_string())?;
        let status = response.status();
        let content_range = response
            .headers()
            .get("Content-Range")
            .and_then(|v| v.to_str().ok())
            .map(str::to_string);
        let body = response.text().await.map_err(|e| e.to_string())?;
        if !status.is_success() {
            return Err(format!("{status}: {body}"));
        }
        Ok((content_range, body))
    }

    /// The body of a request that succeeded, read as `T`.
    async fn send_for<T: for<'de> Deserialize<'de>>(
        builder: postgrest::Builder,
    ) -> Result<T, String> {
        let (_, body) = Self::send(builder).await?;
        serde_json::from_str(&body).map_err(|e| format!("{e}: {body}"))
    }

    /// `None`, and the error logged, when `result` is one.
    fn ok<T>(what: &str, result: Result<T, String>) -> Option<T> {
        result.inspect_err(|e| error!("Could not {what}: {e}")).ok()
    }

    /// Whether to write, or, in a dry run, to say what is not written.
    fn writes(&self, what: &str) -> bool {
        if self.is_dry {
            info!("Running in dry mode. Skipping: {what}");
        }
        !self.is_dry
    }

    async fn read_page(&self, page: Page) -> Result<PageOf<Bot>, String> {
        let size = page.size.max(1) as usize;
        let low = (page.number.max(1) as usize - 1) * size;
        let (content_range, body) = Self::send(
            self.client
                .from("bots")
                .select("uuid,address")
                .eq("approved", "true")
                .order("created_at.asc,uuid.asc")
                .exact_count()
                .range(low, low + size - 1),
        )
        .await?;
        let total = content_range
            .as_deref()
            .and_then(|range| range.rsplit_once('/'))
            .and_then(|(_, total)| total.parse::<u32>().ok())
            .ok_or_else(|| format!("no count in Content-Range {content_range:?}"))?;
        let rows: Vec<BotRow> = serde_json::from_str(&body).map_err(|e| format!("{e}: {body}"))?;
        Ok(PageOf {
            items: rows
                .into_iter()
                .map(|row| Bot {
                    id: row.uuid,
                    address: row.address,
                })
                .collect(),
            total,
        })
    }

    async fn upsert_command(
        &self,
        profile_uuid: &str,
        command: &BotCommand,
    ) -> Result<String, String> {
        let row = BotCommandRow {
            bot_profile_uuid: profile_uuid,
            keyword: &command.keyword,
            label: &command.label,
        };
        let body = serde_json::to_string(&row).map_err(|e| e.to_string())?;
        let inserted: Inserted = Self::send_for(
            self.client
                .from("bot_commands")
                .upsert(body)
                .on_conflict("bot_profile_uuid,keyword")
                .single(),
        )
        .await?;
        Ok(inserted.uuid)
    }

    async fn write_profile(&self, bot_id: &str, profile: &BotProfile) -> Result<(), String> {
        let row = BotProfileRow {
            bot_uuid: bot_id,
            name: &profile.name,
            description: profile.description.as_deref(),
            photo: profile.photo.as_deref(),
        };
        let body = serde_json::to_string(&row).map_err(|e| e.to_string())?;
        let inserted: Inserted = Self::send_for(
            self.client
                .from("bot_profiles")
                .upsert(body)
                .on_conflict("bot_uuid")
                .single(),
        )
        .await?;

        let mut kept = Vec::with_capacity(profile.commands.len());
        for command in &profile.commands {
            kept.push(self.upsert_command(&inserted.uuid, command).await?);
        }

        let mut delete = self
            .client
            .from("bot_commands")
            .delete()
            .eq("bot_profile_uuid", &inserted.uuid);
        if !kept.is_empty() {
            delete = delete.not("in", "uuid", format!("({})", kept.join(",")));
        }
        Self::send(delete).await.map(|_| ())
    }

    async fn write_greeting_message(&self, bot_id: &str, text: &str) -> Result<(), String> {
        let row = BotGreetingMessageRow {
            bot_uuid: bot_id,
            text,
        };
        let body = serde_json::to_string(&row).map_err(|e| e.to_string())?;
        Self::send(
            self.client
                .from("bot_greeting_messages")
                .upsert(body)
                .on_conflict("bot_uuid"),
        )
        .await
        .map(|_| ())
    }

    async fn write_check(&self, bot_id: &str, check: &BotCheck) -> Result<(), String> {
        let row = BotStatusRow {
            bot_uuid: bot_id,
            is_online: matches!(check, BotCheck::Online { .. }),
        };
        let body = serde_json::to_string(&row).map_err(|e| e.to_string())?;
        Self::send(self.client.from("bot_statuses").insert(body))
            .await
            .map(|_| ())
    }
}

impl BotRepositoryPort for BotsRepository {
    async fn read_bots(&self, page: Page) -> Option<PageOf<Bot>> {
        Self::ok("read the bots", self.read_page(page).await)
    }

    async fn replace_profile(&self, bot_id: &str, profile: &BotProfile) -> Option<()> {
        if !self.writes("the profile") {
            return Some(());
        }
        Self::ok(
            "replace the profile",
            self.write_profile(bot_id, profile).await,
        )
    }

    async fn replace_greeting_message(&self, bot_id: &str, text: &str) -> Option<()> {
        if !self.writes("the greeting message") {
            return Some(());
        }
        Self::ok(
            "replace the greeting message",
            self.write_greeting_message(bot_id, text).await,
        )
    }

    async fn create_check(&self, bot_id: &str, check: &BotCheck) -> Option<()> {
        if !self.writes("the status") {
            return Some(());
        }
        Self::ok("add the status", self.write_check(bot_id, check).await)
    }
}
