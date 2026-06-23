use crate::{
    smp::BotTestResult,
    types::{Bot, BotCommand, BotProfile},
};
pub use postgrest::Postgrest;
use serde::{self, Deserialize, Serialize};
use std::error::Error;
pub type DatabaseClient = Postgrest;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct RawBot<'a> {
    pub uuid: &'a str,
    pub address: &'a str,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
struct RawBotGreetingMessage<'a> {
    pub bot_uuid: &'a str,
    pub text: &'a str,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
struct RawBotStatus<'a> {
    pub bot_uuid: &'a str,
    pub is_online: bool,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
struct RawBotProfile<'a> {
    pub bot_uuid: &'a str,
    pub name: &'a str,
    pub description: Option<&'a str>,
    pub photo: Option<&'a str>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
struct RawBotCommand<'a> {
    pub bot_profile_uuid: &'a str,
    pub keyword: &'a str,
    pub label: &'a str,
}

pub struct Database {
    client: DatabaseClient,
}

impl Database {
    pub fn new(url: &str, token: &str) -> Database {
        let client = Postgrest::new(url)
            .insert_header("apikey", token)
            .insert_header("Authorization", format!("Bearer {}", token));

        Self { client }
    }

    pub async fn bots_get_all(&self) -> Result<Vec<Bot>, Box<dyn Error>> {
        let response = self
            .client
            .from("bots")
            .select("*")
            .execute()
            .await?
            .text()
            .await?;

        let bots: Vec<RawBot> = serde_json::from_str(&response)?;
        Ok(bots
            .into_iter()
            .map(|raw_bot| Bot {
                uuid: raw_bot.uuid.to_string(),
                address: raw_bot.address.to_string(),
            })
            .collect())
    }

    /// Inserts a new command into the database
    /// Returns the UUID of the inserted command
    async fn insert_command(
        &self,
        bot_profile_uuid: &str,
        command: &BotCommand,
    ) -> Result<String, Box<dyn Error>> {
        let raw_command = RawBotCommand {
            bot_profile_uuid,
            keyword: &command.keyword,
            label: &command.label,
        };

        #[derive(Serialize, Deserialize, Debug)]
        #[serde(rename_all = "snake_case")]
        struct InsertedCommand {
            pub uuid: String,
        }

        let inserted_command: InsertedCommand = serde_json::from_str(
            self.client
                .from("bot_commands")
                .upsert(serde_json::to_string(&raw_command)?)
                .on_conflict("bot_profile_uuid,keyword")
                .single()
                .execute()
                .await?
                .text()
                .await?
                .as_str(),
        )?;

        Ok(inserted_command.uuid)
    }

    /// Inserts a new status value along with its associated commands into the database
    /// Returns the UUID of the inserted status value
    pub async fn bot_update_profile(
        &self,
        bot_uuid: &str,
        profile: &BotProfile,
    ) -> Result<(), Box<dyn Error>> {
        let raw_profile = RawBotProfile {
            bot_uuid,
            name: &profile.name,
            description: profile.description.as_deref(),
            photo: profile.photo.as_deref(),
        };

        #[derive(Serialize, Deserialize, Debug)]
        #[serde(rename_all = "snake_case")]
        struct InsertedProfile {
            uuid: String,
        }

        let inserted_profile: InsertedProfile = serde_json::from_str(
            self.client
                .from("bot_profiles")
                .upsert(serde_json::to_string(&raw_profile)?)
                .on_conflict("bot_uuid")
                .single()
                .execute()
                .await?
                .text()
                .await?
                .as_str(),
        )?;

        let mut inserted_commands: Vec<String> = Vec::new();
        for command in &profile.commands {
            let uuid = self.insert_command(&inserted_profile.uuid, command).await?;
            inserted_commands.push(uuid);
        }

        let mut delete_query = self
            .client
            .from("bot_commands")
            .delete()
            .eq("bot_profile_uuid", &inserted_profile.uuid);

        if !inserted_commands.is_empty() {
            delete_query = delete_query.not(
                "in",
                "uuid",
                format!("(\"{}\")", inserted_commands.join(",")),
            );
        }

        delete_query.execute().await?.text().await?;

        Ok(())
    }

    async fn insert_greeting_message(
        &self,
        bot_uuid: &str,
        text: &str,
    ) -> Result<String, Box<dyn Error>> {
        let raw_greeting_message = RawBotGreetingMessage { bot_uuid, text };

        #[derive(Serialize, Deserialize, Debug)]
        #[serde(rename_all = "snake_case")]
        struct InsertedGreetingMessage {
            pub uuid: String,
        }

        let inserted_greeting_message: InsertedGreetingMessage = serde_json::from_str(
            self.client
                .from("bot_greeting_messages")
                .upsert(serde_json::to_string(&raw_greeting_message)?)
                .on_conflict("bot_uuid")
                .single()
                .execute()
                .await?
                .text()
                .await?
                .as_str(),
        )?;

        Ok(inserted_greeting_message.uuid)
    }

    pub async fn bot_insert_status(
        &self,
        bot_uuid: &str,
        bot_status: &BotTestResult,
    ) -> Result<(), Box<dyn Error>> {
        if let Some(text) = bot_status.greeting_message.as_deref() {
            self.insert_greeting_message(bot_uuid, text).await?;
        }

        let raw_status = RawBotStatus {
            bot_uuid,
            is_online: bot_status.is_online,
        };

        self.client
            .from("bot_statuses")
            .insert(serde_json::to_string(&raw_status)?)
            .execute()
            .await?
            .text()
            .await?;

        Ok(())
    }
}
