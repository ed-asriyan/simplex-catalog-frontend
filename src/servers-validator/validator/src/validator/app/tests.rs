//! Tests of the servers validator through its inbound port, with in-memory fakes of the four outbound ports.

use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::rc::Rc;

use super::App;
use crate::validator::ports::{
    Availability, GeoIpPort, HttpCheckerPort, Page, PageOf, Server, ServerCheckerPort,
    ServerRepositoryPort, ServerStatus, ServerType, ServersValidatorPort,
};

// ---- fakes ----------------------------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq)]
struct Written {
    server_id: String,
    country: Option<String>,
    info_page_available: bool,
    availability: Availability,
}

#[derive(Default)]
struct RepositoryState {
    /// (is XFTP, id, identity, host)
    servers: Vec<(bool, String, String, String)>,
    unreadable: bool,
    rejects_writes: bool,
    pages_asked: Vec<Page>,
    writes: Vec<Written>,
}

#[derive(Clone, Default)]
struct FakeRepository(Rc<RefCell<RepositoryState>>);

impl ServerRepositoryPort for FakeRepository {
    async fn get_servers(&self, page: Page) -> Option<PageOf<Server>> {
        let mut state = self.0.borrow_mut();
        state.pages_asked.push(page);
        if state.unreadable {
            return None;
        }
        let from = (page.number.saturating_sub(1) as usize).saturating_mul(page.size as usize);
        let items = state
            .servers
            .iter()
            .skip(from)
            .take(page.size as usize)
            .map(|(xftp, id, identity, host)| Server {
                type_: if *xftp {
                    ServerType::XFTP
                } else {
                    ServerType::SMP
                },
                id: id.clone(),
                identity: identity.clone(),
                host: host.clone(),
            })
            .collect();
        Some(PageOf {
            items,
            total: state.servers.len() as u32,
        })
    }

    async fn update_server_status(&self, server_id: &str, status: &ServerStatus) -> Option<()> {
        let mut state = self.0.borrow_mut();
        if state.rejects_writes {
            return None;
        }
        state.writes.push(Written {
            server_id: server_id.to_string(),
            country: status.country.clone(),
            info_page_available: status.info_page_available,
            availability: status.availability,
        });
        Some(())
    }
}

#[derive(Default)]
struct CheckerState {
    /// What each url answers, in order; the last answer repeats.
    script: HashMap<String, Vec<Option<Availability>>>,
    asked: Vec<String>,
}

#[derive(Clone, Default)]
struct FakeChecker(Rc<RefCell<CheckerState>>);

impl FakeChecker {
    fn asked(&self, url: &str) -> usize {
        self.0.borrow().asked.iter().filter(|u| *u == url).count()
    }
}

impl ServerCheckerPort for FakeChecker {
    async fn check_server(&self, url: &str) -> Option<Availability> {
        let mut state = self.0.borrow_mut();
        let n = state.asked.iter().filter(|u| *u == url).count();
        state.asked.push(url.to_string());
        let answers = state.script.get(url)?;
        *answers.get(n).or(answers.last())?
    }
}

#[derive(Clone, Default)]
struct FakeGeoIp(Rc<RefCell<HashMap<String, String>>>);

impl GeoIpPort for FakeGeoIp {
    async fn get_country(&self, host: &str) -> Option<String> {
        self.0.borrow().get(host).cloned()
    }
}

#[derive(Clone, Default)]
struct FakeHttpChecker(Rc<RefCell<HashSet<String>>>);

impl HttpCheckerPort for FakeHttpChecker {
    async fn is_page_available(&self, host: &str) -> bool {
        self.0.borrow().contains(host)
    }
}

struct World {
    repository: FakeRepository,
    checker: FakeChecker,
    geoip: FakeGeoIp,
    http: FakeHttpChecker,
}

impl World {
    fn new() -> Self {
        Self {
            repository: FakeRepository::default(),
            checker: FakeChecker::default(),
            geoip: FakeGeoIp::default(),
            http: FakeHttpChecker::default(),
        }
    }

    /// A server of the catalog, with what each of its checks answers.
    fn server(
        &self,
        xftp: bool,
        id: &str,
        host: &str,
        tests: &[Option<Availability>],
        country: Option<&str>,
        info_page: bool,
    ) {
        let identity = format!("identity-{id}");
        let schema = if xftp { "xftp" } else { "smp" };
        self.repository.0.borrow_mut().servers.push((
            xftp,
            id.to_string(),
            identity.clone(),
            host.to_string(),
        ));
        self.checker
            .0
            .borrow_mut()
            .script
            .insert(format!("{schema}://{identity}@{host}"), tests.to_vec());
        if let Some(country) = country {
            self.geoip
                .0
                .borrow_mut()
                .insert(host.to_string(), country.to_string());
        }
        if info_page {
            self.http.0.borrow_mut().insert(host.to_string());
        }
    }

    async fn run(&self, retry_count: u32) {
        App::new(
            self.repository.clone(),
            self.checker.clone(),
            self.geoip.clone(),
            self.http.clone(),
        )
        .check_servers(retry_count)
        .await;
    }

    fn writes(&self) -> Vec<Written> {
        let mut writes = self.repository.0.borrow().writes.clone();
        writes.sort_by(|a, b| a.server_id.cmp(&b.server_id));
        writes
    }
}

const ONLINE: Option<Availability> = Some(Availability::Online);
const OFFLINE: Option<Availability> = Some(Availability::Offline);

// ---- tests ----------------------------------------------------------------------------------------------

// US-B48: the check reads every page of the servers, however many pages the backend has.
#[tokio::test]
async fn every_page_of_the_servers_is_read() {
    let world = World::new();
    let total = 2500;
    for i in 0..total {
        world.server(
            false,
            &format!("s{i:05}"),
            &format!("h{i}.example"),
            &[ONLINE],
            Some("DE"),
            true,
        );
    }

    world.run(1).await;

    let writes = world.writes();
    assert_eq!(writes.len(), total);
    let ids: HashSet<_> = writes.iter().map(|w| w.server_id.clone()).collect();
    assert_eq!(ids.len(), total, "every server is checked once");
    let pages = world.repository.0.borrow().pages_asked.clone();
    assert!(
        pages.iter().all(|p| p.size >= 1 && p.number >= 1),
        "pages count from 1: {pages:?}"
    );
    assert!(pages.iter().any(|p| p.number == 1));
}

// US-B48: an empty catalog is read and nothing is written.
#[tokio::test]
async fn no_servers_write_nothing() {
    let world = World::new();
    world.run(1).await;
    assert!(world.writes().is_empty());
}

// US-B48: when the backend cannot be read, nothing is checked or written.
#[tokio::test]
async fn unreadable_backend_writes_nothing() {
    let world = World::new();
    world.server(false, "a", "a.example", &[ONLINE], Some("DE"), true);
    world.repository.0.borrow_mut().unreadable = true;

    world.run(1).await;

    assert!(world.writes().is_empty());
    assert!(world.checker.0.borrow().asked.is_empty());
}

// US-B48, US-B49, US-B50: a server that answered is written Online with its country and info page.
#[tokio::test]
async fn online_server_is_written_online_with_country_and_info_page() {
    let world = World::new();
    world.server(false, "a", "a.example", &[ONLINE], Some("DE"), true);

    world.run(2).await;

    assert_eq!(
        world.writes(),
        vec![Written {
            server_id: "a".into(),
            country: Some("DE".into()),
            info_page_available: true,
            availability: Availability::Online,
        }]
    );
    assert_eq!(
        world.checker.asked("smp://identity-a@a.example"),
        1,
        "an Online answer is not asked again"
    );
}

// US-B48: a SMP server is tested as smp://, an XFTP one as xftp://, by its identity and host.
#[tokio::test]
async fn servers_are_tested_by_their_protocol_identity_and_host() {
    let world = World::new();
    world.server(false, "a", "a.example", &[ONLINE], Some("DE"), false);
    world.server(true, "b", "b.example", &[ONLINE], Some("DE"), false);

    world.run(1).await;

    let mut asked = world.checker.0.borrow().asked.clone();
    asked.sort();
    assert_eq!(
        asked,
        vec!["smp://identity-a@a.example", "xftp://identity-b@b.example"]
    );
}

// US-B48: a server that did not answer, even after the tries, is written Offline.
#[tokio::test]
async fn offline_server_is_written_offline_after_every_try() {
    let world = World::new();
    world.server(false, "a", "a.example", &[OFFLINE], Some("DE"), false);

    world.run(3).await;

    let writes = world.writes();
    assert_eq!(writes.len(), 1);
    assert_eq!(writes[0].availability, Availability::Offline);
    assert_eq!(
        world.checker.asked("smp://identity-a@a.example"),
        4,
        "once, and again 3 times"
    );
}

// US-B48: a server that answers a later try is Online.
#[tokio::test]
async fn server_that_answers_a_later_try_is_written_online() {
    let world = World::new();
    world.server(
        false,
        "a",
        "a.example",
        &[OFFLINE, OFFLINE, ONLINE],
        Some("DE"),
        false,
    );

    world.run(3).await;

    assert_eq!(world.writes()[0].availability, Availability::Online);
    assert_eq!(world.checker.asked("smp://identity-a@a.example"), 3);
}

// US-B48: with no tries again, the server is still tested once.
#[tokio::test]
async fn with_no_retries_a_server_is_tested_once() {
    let world = World::new();
    world.server(false, "a", "a.example", &[OFFLINE], Some("DE"), false);

    world.run(0).await;

    assert_eq!(world.checker.asked("smp://identity-a@a.example"), 1);
    assert_eq!(world.writes()[0].availability, Availability::Offline);
}

// US-B48: a test that could not be asked is asked again up to `retry_count` times, and then nothing is written
// of that server; the others are checked all the same.
#[tokio::test]
async fn test_that_cannot_be_asked_is_asked_again_and_then_nothing_is_written() {
    let world = World::new();
    world.server(false, "a", "a.example", &[None], Some("DE"), true);
    world.server(false, "b", "b.example", &[ONLINE], Some("DE"), true);

    world.run(3).await;

    assert_eq!(
        world.checker.asked("smp://identity-a@a.example"),
        4,
        "once, and again 3 times"
    );
    let writes = world.writes();
    assert_eq!(writes.len(), 1);
    assert_eq!(writes[0].server_id, "b");
}

// US-B48: a test that could not be asked once and then is answered is written as it answered.
#[tokio::test]
async fn test_that_cannot_be_asked_once_is_asked_again() {
    let world = World::new();
    world.server(false, "a", "a.example", &[None, ONLINE], Some("DE"), true);

    world.run(2).await;

    assert_eq!(world.checker.asked("smp://identity-a@a.example"), 2);
    assert_eq!(world.writes()[0].availability, Availability::Online);
}

// US-B49: a server whose host has no country has no check written.
#[tokio::test]
async fn server_with_no_country_has_no_check_written() {
    let world = World::new();
    world.server(false, "a", "a.example", &[ONLINE], None, true);
    world.server(false, "b", "b.example", &[ONLINE], Some("JP"), true);

    world.run(1).await;

    let writes = world.writes();
    assert_eq!(writes.len(), 1);
    assert_eq!(writes[0].server_id, "b");
}

// US-B49: a host on Tor, I2P or Yggdrasil is written with that as its location.
#[tokio::test]
async fn hidden_network_location_is_written_as_given() {
    let world = World::new();
    world.server(false, "a", "a.onion", &[ONLINE], Some("TOR"), false);
    world.server(true, "b", "b.i2p", &[ONLINE], Some("I2P"), false);
    world.server(false, "c", "c.ygg", &[ONLINE], Some("Yggdrasil"), false);

    world.run(1).await;

    let countries: Vec<_> = world.writes().into_iter().map(|w| w.country).collect();
    assert_eq!(
        countries,
        vec![
            Some("TOR".to_string()),
            Some("I2P".to_string()),
            Some("Yggdrasil".to_string())
        ]
    );
}

// US-B50: the info page is written as available or not, per host, and does not keep the check from being written.
#[tokio::test]
async fn info_page_is_written_per_server() {
    let world = World::new();
    world.server(false, "a", "a.example", &[ONLINE], Some("DE"), true);
    world.server(false, "b", "b.example", &[ONLINE], Some("DE"), false);

    world.run(1).await;

    let writes = world.writes();
    assert!(writes[0].info_page_available);
    assert!(!writes[1].info_page_available);
}

// US-B50: an offline server's info page is still looked at.
#[tokio::test]
async fn offline_server_still_has_its_info_page_checked() {
    let world = World::new();
    world.server(false, "a", "a.example", &[OFFLINE], Some("DE"), true);

    world.run(1).await;

    let writes = world.writes();
    assert_eq!(writes[0].availability, Availability::Offline);
    assert!(writes[0].info_page_available);
}

// US-B48: a check the backend did not take does not stop the others from being checked.
#[tokio::test]
async fn rejected_write_does_not_stop_the_run() {
    let world = World::new();
    world.server(false, "a", "a.example", &[ONLINE], Some("DE"), true);
    world.server(false, "b", "b.example", &[ONLINE], Some("DE"), true);
    world.repository.0.borrow_mut().rejects_writes = true;

    world.run(1).await;

    assert_eq!(world.checker.asked("smp://identity-a@a.example"), 1);
    assert_eq!(world.checker.asked("smp://identity-b@b.example"), 1);
}
