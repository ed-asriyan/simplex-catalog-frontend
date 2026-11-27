//! The application's tests: through `BotsValidatorPort`, with in-memory fakes of the outbound ports that keep
//! a log of what they were asked.

use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::rc::Rc;
use std::time::Duration;

use super::App;
use crate::validator::ports::{
    Bot, BotAddress, BotAddressPort, BotCheck, BotCommand, BotContactPort, BotProfile,
    BotRepositoryPort, BotsValidatorPort, Connection, Contact, FirstMessage, Page, PageOf, Visitor,
    VisitorPort,
};

const TIME_LIMIT: Duration = Duration::from_secs(42);
const GREETING: &str = "Hello, I am a bot";

/// What the fakes were asked, in the order they were asked it.
#[derive(Debug, Clone, PartialEq)]
enum Event {
    ReadBots(Page),
    NewVisitor(Visitor),
    LookUp(Visitor, String),
    Connect(Visitor, String, Duration),
    FirstMessage(Visitor, Contact, Duration),
    Delete(Visitor, Contact),
    ReplaceProfile(String, BotProfile),
    ReplaceGreeting(String, String),
    CreateCheck(String, BotCheck),
}

/// What the outside answers to one try of a check of a bot. `None` is "could not be asked".
#[derive(Debug, Clone)]
struct Try {
    look_up: Option<BotAddress>,
    connect: Option<Connection>,
    first_message: Option<FirstMessage>,
    delete: Option<()>,
}

fn profile() -> BotProfile {
    BotProfile {
        name: "Weather".into(),
        description: Some("Tells the weather".into()),
        photo: None,
        commands: vec![BotCommand {
            keyword: "forecast".into(),
            label: "Forecast".into(),
        }],
    }
}

fn link_of(address: &str) -> String {
    format!("link:{address}")
}

fn contact() -> Contact {
    Contact(7)
}

impl Try {
    fn of(address: &str, profile: Option<BotProfile>) -> Self {
        Self {
            look_up: Some(BotAddress {
                profile,
                link: link_of(address),
            }),
            connect: Some(Connection::Accepted(contact())),
            first_message: Some(FirstMessage::Wrote(GREETING.into())),
            delete: Some(()),
        }
    }
}

/// What every bot answers unless a test says otherwise: it has a profile, accepts, and writes a greeting.
fn answers(address: &str) -> Try {
    Try::of(address, Some(profile()))
}

#[derive(Default)]
struct State {
    bots: Vec<Bot>,
    /// The answers of each address, one per try; the last repeats.
    scripts: HashMap<String, Vec<Try>>,
    tries: HashMap<String, usize>,
    visitor_of_address: HashMap<i64, String>,
    next_visitor: i64,
    read_bots_fails: bool,
    new_visitor_fails: bool,
    log: Vec<Event>,
}

impl State {
    fn current(&self, address: &str) -> Try {
        let script = self.scripts.get(address);
        match script {
            Some(script) => {
                let n = self.tries.get(address).copied().unwrap_or(1);
                script[(n - 1).min(script.len() - 1)].clone()
            }
            None => answers(address),
        }
    }
}

#[derive(Clone, Default)]
struct World(Rc<RefCell<State>>);

impl World {
    fn with_bots(count: usize) -> Self {
        let world = World::default();
        world.0.borrow_mut().bots = (1..=count)
            .map(|n| Bot {
                id: format!("id{n}"),
                address: format!("bot{n}"),
            })
            .collect();
        world
    }

    fn script(&self, address: &str, tries: Vec<Try>) {
        self.0.borrow_mut().scripts.insert(address.into(), tries);
    }

    fn log(&self) -> Vec<Event> {
        self.0.borrow().log.clone()
    }

    /// What was written to the repository.
    fn writes(&self) -> Vec<Event> {
        self.log()
            .into_iter()
            .filter(|e| {
                matches!(
                    e,
                    Event::ReplaceProfile(..) | Event::ReplaceGreeting(..) | Event::CreateCheck(..)
                )
            })
            .collect()
    }

    fn checks(&self) -> Vec<(String, BotCheck)> {
        self.log()
            .into_iter()
            .filter_map(|e| match e {
                Event::CreateCheck(id, check) => Some((id, check)),
                _ => None,
            })
            .collect()
    }

    fn new_visitors(&self) -> Vec<Visitor> {
        self.log()
            .into_iter()
            .filter_map(|e| match e {
                Event::NewVisitor(v) => Some(v),
                _ => None,
            })
            .collect()
    }

    fn app(&self) -> App<FakeVisitors, FakeAddresses, FakeContacts, FakeRepository> {
        App::new(
            FakeVisitors(self.clone()),
            FakeAddresses(self.clone()),
            FakeContacts(self.clone()),
            FakeRepository(self.clone()),
            TIME_LIMIT,
        )
    }
}

struct FakeVisitors(World);
struct FakeAddresses(World);
struct FakeContacts(World);
struct FakeRepository(World);

impl VisitorPort for FakeVisitors {
    async fn new_visitor(&self) -> Option<Visitor> {
        let mut s = self.0.0.borrow_mut();
        if s.new_visitor_fails {
            return None;
        }
        s.next_visitor += 1;
        let visitor = Visitor(s.next_visitor);
        s.log.push(Event::NewVisitor(visitor));
        Some(visitor)
    }
}

impl BotAddressPort for FakeAddresses {
    async fn look_up(&self, visitor: Visitor, address: &str) -> Option<BotAddress> {
        let mut s = self.0.0.borrow_mut();
        s.log.push(Event::LookUp(visitor, address.into()));
        *s.tries.entry(address.into()).or_insert(0) += 1;
        s.visitor_of_address.insert(visitor.0, address.into());
        s.current(address).look_up
    }
}

impl BotContactPort for FakeContacts {
    async fn connect(&self, visitor: Visitor, link: &str, within: Duration) -> Option<Connection> {
        let mut s = self.0.0.borrow_mut();
        s.log.push(Event::Connect(visitor, link.into(), within));
        let address = link
            .strip_prefix("link:")
            .expect("a link of the fake")
            .to_string();
        s.current(&address).connect
    }

    async fn first_message(
        &self,
        visitor: Visitor,
        contact: Contact,
        within: Duration,
    ) -> Option<FirstMessage> {
        let mut s = self.0.0.borrow_mut();
        s.log.push(Event::FirstMessage(visitor, contact, within));
        let address = s.visitor_of_address[&visitor.0].clone();
        s.current(&address).first_message
    }

    async fn delete(&self, visitor: Visitor, contact: Contact) -> Option<()> {
        let mut s = self.0.0.borrow_mut();
        s.log.push(Event::Delete(visitor, contact));
        let address = s.visitor_of_address[&visitor.0].clone();
        s.current(&address).delete
    }
}

impl BotRepositoryPort for FakeRepository {
    async fn read_bots(&self, page: Page) -> Option<PageOf<Bot>> {
        let mut s = self.0.0.borrow_mut();
        s.log.push(Event::ReadBots(page));
        if s.read_bots_fails {
            return None;
        }
        let start = ((page.number.max(1) - 1) as usize).saturating_mul(page.size as usize);
        let items = s
            .bots
            .iter()
            .skip(start)
            .take(page.size as usize)
            .cloned()
            .collect();
        Some(PageOf {
            items,
            total: s.bots.len() as u32,
        })
    }

    async fn replace_profile(&self, bot_id: &str, profile: &BotProfile) -> Option<()> {
        self.0
            .0
            .borrow_mut()
            .log
            .push(Event::ReplaceProfile(bot_id.into(), profile.clone()));
        Some(())
    }

    async fn replace_greeting_message(&self, bot_id: &str, text: &str) -> Option<()> {
        self.0
            .0
            .borrow_mut()
            .log
            .push(Event::ReplaceGreeting(bot_id.into(), text.into()));
        Some(())
    }

    async fn create_check(&self, bot_id: &str, check: &BotCheck) -> Option<()> {
        self.0
            .0
            .borrow_mut()
            .log
            .push(Event::CreateCheck(bot_id.into(), check.clone()));
        Some(())
    }
}

fn is_online(check: &BotCheck) -> bool {
    matches!(check, BotCheck::Online { .. })
}

// US-C22
#[tokio::test]
async fn every_page_of_the_bots_is_read() {
    let world = World::with_bots(2_500);

    world.app().check_bots(0).await;

    let pages: Vec<Page> = world
        .log()
        .into_iter()
        .filter_map(|e| match e {
            Event::ReadBots(page) => Some(page),
            _ => None,
        })
        .collect();
    assert!(!pages.is_empty());
    for (i, page) in pages.iter().enumerate() {
        assert_eq!(page.number, i as u32 + 1, "pages are read in turn from 1");
        assert_eq!(page.size, pages[0].size, "pages are of one size");
    }
    let checked: Vec<String> = world.checks().into_iter().map(|(id, _)| id).collect();
    let checked_once: HashSet<&String> = checked.iter().collect();
    assert_eq!(checked.len(), 2_500, "every bot is checked once");
    assert_eq!(checked_once.len(), 2_500);
}

// US-C22
#[tokio::test]
async fn nothing_is_checked_when_the_bots_could_not_be_read() {
    let world = World::with_bots(3);
    world.0.borrow_mut().read_bots_fails = true;

    world.app().check_bots(2).await;

    assert!(world.new_visitors().is_empty());
    assert!(world.writes().is_empty());
}

// US-C25
#[tokio::test]
async fn each_check_is_made_as_a_new_visitor() {
    let world = World::with_bots(3);

    world.app().check_bots(0).await;

    let log = world.log();
    let mut visitor_of_bot: HashMap<String, Visitor> = HashMap::new();
    for event in &log {
        if let Event::LookUp(visitor, address) = event {
            assert!(visitor_of_bot.insert(address.clone(), *visitor).is_none());
        }
    }
    let visitors: HashSet<i64> = visitor_of_bot.values().map(|v| v.0).collect();
    assert_eq!(visitors.len(), 3, "no two bots are checked as one visitor");
    assert_eq!(world.new_visitors().len(), 3);
    for event in &log {
        match event {
            Event::Connect(visitor, link, _) => {
                let address = link.strip_prefix("link:").unwrap();
                assert_eq!(*visitor, visitor_of_bot[address]);
            }
            Event::FirstMessage(visitor, ..) | Event::Delete(visitor, ..) => {
                assert!(visitors.contains(&visitor.0));
            }
            _ => {}
        }
    }
    let deletes = log
        .iter()
        .filter(|e| matches!(e, Event::Delete(..)))
        .count();
    assert_eq!(deletes, 3, "each contact is deleted");
}

// US-C25
#[tokio::test]
async fn each_try_is_made_as_a_new_visitor() {
    let world = World::with_bots(1);
    world.script(
        "bot1",
        vec![Try {
            connect: Some(Connection::NotAccepted),
            ..answers("bot1")
        }],
    );

    world.app().check_bots(2).await;

    let looked_up: HashSet<i64> = world
        .log()
        .into_iter()
        .filter_map(|e| match e {
            Event::LookUp(v, _) => Some(v.0),
            _ => None,
        })
        .collect();
    assert_eq!(looked_up.len(), 3);
}

// US-C26
#[tokio::test]
async fn an_address_without_a_profile_is_offline_and_no_contact_is_asked() {
    let world = World::with_bots(1);
    world.script("bot1", vec![Try::of("bot1", None)]);

    world.app().check_bots(0).await;

    let log = world.log();
    assert!(!log.iter().any(|e| matches!(
        e,
        Event::Connect(..) | Event::FirstMessage(..) | Event::Delete(..)
    )));
    assert_eq!(
        world.writes(),
        vec![Event::CreateCheck("id1".into(), BotCheck::Offline)]
    );
}

// US-C24, US-C25, US-C27
#[tokio::test]
async fn a_bot_that_accepted_and_wrote_has_its_profile_and_greeting_replaced_and_is_online() {
    let world = World::with_bots(1);

    world.app().check_bots(0).await;

    let log = world.log();
    let writes = world.writes();
    assert!(writes.contains(&Event::ReplaceProfile("id1".into(), profile())));
    assert!(writes.contains(&Event::ReplaceGreeting("id1".into(), GREETING.into())));
    let checks = world.checks();
    assert_eq!(checks.len(), 1);
    assert_eq!(checks[0].0, "id1");
    assert!(is_online(&checks[0].1));
    let visitor = world.new_visitors()[0];
    assert!(log.contains(&Event::Delete(visitor, contact())));
    assert_eq!(
        log.iter()
            .filter(|e| matches!(e, Event::Delete(..)))
            .count(),
        1,
        "the contact is deleted once"
    );
    assert!(log.contains(&Event::FirstMessage(visitor, contact(), TIME_LIMIT)));
}

// US-C27
#[tokio::test]
async fn a_bot_that_accepted_but_wrote_nothing_is_online_and_its_greeting_is_left_as_it_is() {
    let world = World::with_bots(1);
    world.script(
        "bot1",
        vec![Try {
            first_message: Some(FirstMessage::Silent),
            ..answers("bot1")
        }],
    );

    world.app().check_bots(0).await;

    let writes = world.writes();
    assert!(
        !writes
            .iter()
            .any(|e| matches!(e, Event::ReplaceGreeting(..)))
    );
    assert!(writes.contains(&Event::ReplaceProfile("id1".into(), profile())));
    assert_eq!(
        world.checks(),
        vec![(
            "id1".to_string(),
            BotCheck::Online {
                greeting_message: None
            }
        )]
    );
    assert!(
        world.log().iter().any(|e| matches!(e, Event::Delete(..))),
        "the contact is deleted"
    );
}

// US-C24, US-C25
#[tokio::test]
async fn a_bot_that_did_not_accept_within_the_time_limit_has_its_profile_replaced_and_is_offline() {
    let world = World::with_bots(1);
    world.script(
        "bot1",
        vec![Try {
            connect: Some(Connection::NotAccepted),
            ..answers("bot1")
        }],
    );

    world.app().check_bots(0).await;

    let log = world.log();
    assert!(!log.iter().any(|e| matches!(e, Event::FirstMessage(..))));
    assert_eq!(
        world.writes(),
        vec![
            Event::ReplaceProfile("id1".into(), profile()),
            Event::CreateCheck("id1".into(), BotCheck::Offline),
        ]
    );
}

// US-C25, US-C27
#[tokio::test]
async fn the_time_limit_is_given_to_connecting_and_to_the_first_message() {
    let world = World::with_bots(1);

    world.app().check_bots(0).await;

    let log = world.log();
    assert!(
        log.iter()
            .any(|e| matches!(e, Event::Connect(_, _, within) if *within == TIME_LIMIT))
    );
    assert!(
        log.iter()
            .any(|e| matches!(e, Event::FirstMessage(_, _, within) if *within == TIME_LIMIT))
    );
    assert!(log.iter().all(|e| match e {
        Event::Connect(_, _, within) | Event::FirstMessage(_, _, within) => *within == TIME_LIMIT,
        _ => true,
    }));
}

// US-C25, US-C28
#[tokio::test]
async fn a_bot_that_is_not_online_is_checked_again_up_to_the_retry_count_and_one_check_is_written()
{
    let world = World::with_bots(1);
    world.script(
        "bot1",
        vec![Try {
            connect: Some(Connection::NotAccepted),
            ..answers("bot1")
        }],
    );

    world.app().check_bots(3).await;

    let tries = world
        .log()
        .iter()
        .filter(|e| matches!(e, Event::LookUp(..)))
        .count();
    assert_eq!(tries, 4, "the first try and three more");
    assert_eq!(world.checks(), vec![("id1".to_string(), BotCheck::Offline)]);
}

// US-C25
#[tokio::test]
async fn a_bot_that_is_online_on_a_retry_is_online_and_is_not_checked_again() {
    let world = World::with_bots(1);
    let not_accepted = Try {
        connect: Some(Connection::NotAccepted),
        ..answers("bot1")
    };
    world.script(
        "bot1",
        vec![not_accepted.clone(), not_accepted, answers("bot1")],
    );

    world.app().check_bots(5).await;

    let tries = world
        .log()
        .iter()
        .filter(|e| matches!(e, Event::LookUp(..)))
        .count();
    assert_eq!(tries, 3);
    let checks = world.checks();
    assert_eq!(checks.len(), 1);
    assert!(is_online(&checks[0].1));
}

// US-C25
#[tokio::test]
async fn a_bot_that_is_online_at_once_is_checked_once() {
    let world = World::with_bots(1);

    world.app().check_bots(5).await;

    let tries = world
        .log()
        .iter()
        .filter(|e| matches!(e, Event::LookUp(..)))
        .count();
    assert_eq!(tries, 1);
}

// US-C26
#[tokio::test]
async fn a_step_that_could_not_be_asked_writes_nothing_for_that_try() {
    let broken: Vec<(&str, Try)> = vec![
        (
            "the address",
            Try {
                look_up: None,
                ..answers("bot1")
            },
        ),
        (
            "the contact",
            Try {
                connect: None,
                ..answers("bot1")
            },
        ),
        (
            "the first message",
            Try {
                first_message: None,
                ..answers("bot1")
            },
        ),
    ];
    for (step, broken_try) in broken {
        let world = World::with_bots(1);
        world.script("bot1", vec![broken_try]);

        world.app().check_bots(0).await;

        assert!(
            world.writes().is_empty(),
            "{step} could not be asked, yet {:?} was written",
            world.writes()
        );
    }

    let world = World::with_bots(1);
    world.0.borrow_mut().new_visitor_fails = true;
    world.app().check_bots(0).await;
    assert!(
        world.writes().is_empty(),
        "no visitor, yet something was written"
    );
    assert!(!world.log().iter().any(|e| matches!(e, Event::LookUp(..))));
}

// US-C26
#[tokio::test]
async fn a_try_that_could_not_be_made_is_made_again_and_the_one_that_could_is_written() {
    let world = World::with_bots(1);
    world.script(
        "bot1",
        vec![
            Try {
                first_message: None,
                ..answers("bot1")
            },
            answers("bot1"),
        ],
    );

    world.app().check_bots(1).await;

    let checks = world.checks();
    assert_eq!(checks.len(), 1);
    assert!(is_online(&checks[0].1));
}

// US-C26
#[tokio::test]
async fn a_bot_that_could_not_be_checked_does_not_stop_the_others() {
    let world = World::with_bots(3);
    world.script(
        "bot1",
        vec![Try {
            look_up: None,
            ..answers("bot1")
        }],
    );

    world.app().check_bots(0).await;

    let checked: HashSet<String> = world.checks().into_iter().map(|(id, _)| id).collect();
    assert_eq!(
        checked,
        HashSet::from(["id2".to_string(), "id3".to_string()])
    );
}
