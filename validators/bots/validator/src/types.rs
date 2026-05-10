#[derive(Debug)]
pub struct Bot {
    pub uuid: String,
    pub address: String,
}

#[derive(Debug)]
pub struct BotCommand {
    pub keyword: String,
    pub label: String,
}

#[derive(Debug)]
pub struct BotProfile {
    pub name: String,
    pub description: Option<String>,
    pub photo: Option<String>,
    pub commands: Vec<BotCommand>,
}
