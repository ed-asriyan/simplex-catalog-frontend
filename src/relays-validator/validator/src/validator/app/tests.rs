//! The application's tests, through `RelaysValidatorPort`, with in-memory fakes of the outbound ports.

#![allow(clippy::unwrap_used)]

use std::collections::HashMap;
use std::sync::Mutex;

use super::App;
use crate::validator::ports::{
    Page, PageOf, Relay, RelayCheck, RelayProfile, RelayRepositoryPort, RelayTestPort,
    RelaysValidatorPort,
};

/// The most relays the fake backend gives in one page, whatever size is asked: a list longer than that is
/// only complete when every page is read.
const MAX_PAGE_SIZE: u32 = 2;

#[derive(Default)]
struct FakeRepository {
    relays: Vec<Relay>,
    profiles: Mutex<Vec<(String, RelayProfile)>>,
    checks: Mutex<Vec<(String, RelayCheck)>>,
}

impl FakeRepository {
    fn with_relays(relays: &[(&str, &str)]) -> Self {
        Self {
            relays: relays
                .iter()
                .map(|(id, url)| Relay {
                    id: id.to_string(),
                    url: url.to_string(),
                })
                .collect(),
            ..Self::default()
        }
    }

    fn profiles(&self) -> Vec<(String, RelayProfile)> {
        self.profiles.lock().unwrap().clone()
    }

    fn checks(&self) -> Vec<(String, RelayCheck)> {
        let mut checks = self.checks.lock().unwrap().clone();
        checks.sort_by(|a, b| a.0.cmp(&b.0));
        checks
    }
}

impl RelayRepositoryPort for FakeRepository {
    async fn read_relays(&self, page: Page) -> Option<PageOf<Relay>> {
        assert!(page.number >= 1 && page.size >= 1, "a page is numbered from 1");
        let size = page.size.min(MAX_PAGE_SIZE) as usize;
        let items = self
            .relays
            .iter()
            .skip((page.number as usize - 1) * size)
            .take(size)
            .cloned()
            .collect();
        Some(PageOf {
            items,
            total: self.relays.len() as u32,
        })
    }

    async fn replace_profile(&self, relay_id: &str, profile: &RelayProfile) -> Option<()> {
        let mut profiles = self.profiles.lock().unwrap();
        profiles.retain(|(id, _)| id != relay_id);
        profiles.push((relay_id.to_string(), profile.clone()));
        Some(())
    }

    async fn create_check(&self, relay_id: &str, check: &RelayCheck) -> Option<()> {
        self.checks
            .lock()
            .unwrap()
            .push((relay_id.to_string(), check.clone()));
        Some(())
    }
}

/// Answers each relay's address from its script, one answer per ask; an address with no script left cannot be asked.
#[derive(Default)]
struct FakeTest {
    scripts: Mutex<HashMap<String, Vec<Option<RelayCheck>>>>,
    asked: Mutex<HashMap<String, u32>>,
}

impl FakeTest {
    fn answering(url: &str, answers: Vec<Option<RelayCheck>>) -> Self {
        let test = Self::default();
        test.scripts.lock().unwrap().insert(url.to_string(), answers);
        test
    }

    fn also(self, url: &str, answers: Vec<Option<RelayCheck>>) -> Self {
        self.scripts.lock().unwrap().insert(url.to_string(), answers);
        self
    }

    fn times_asked(&self, url: &str) -> u32 {
        self.asked.lock().unwrap().get(url).copied().unwrap_or(0)
    }
}

impl RelayTestPort for FakeTest {
    async fn test(&self, url: &str) -> Option<RelayCheck> {
        *self.asked.lock().unwrap().entry(url.to_string()).or_insert(0) += 1;
        let mut scripts = self.scripts.lock().unwrap();
        let script = scripts.get_mut(url)?;
        if script.is_empty() {
            None
        } else {
            script.remove(0)
        }
    }
}

fn profile(name: &str) -> RelayProfile {
    RelayProfile {
        name: name.to_string(),
        image: Some(format!("data:image/png;base64,{name}")),
    }
}

fn online(name: &str) -> RelayCheck {
    RelayCheck::Online {
        profile: profile(name),
    }
}

// US-D22, US-D23, US-D24
#[tokio::test]
async fn every_page_of_the_relays_is_read_and_each_relay_is_checked() {
    let relays = [
        ("r1", "url1"),
        ("r2", "url2"),
        ("r3", "url3"),
        ("r4", "url4"),
        ("r5", "url5"),
    ];
    let repository = FakeRepository::with_relays(&relays);
    let test = FakeTest::answering("url1", vec![Some(online("one"))])
        .also("url2", vec![Some(RelayCheck::Offline)])
        .also("url3", vec![Some(online("three"))])
        .also("url4", vec![Some(RelayCheck::Offline)])
        .also("url5", vec![Some(online("five"))]);
    let app = App::new(repository, test);

    app.check_relays(1).await;

    let checked: Vec<String> = app.relay_repository.checks().into_iter().map(|(id, _)| id).collect();
    assert_eq!(checked, ["r1", "r2", "r3", "r4", "r5"]);
    for (_, url) in relays {
        assert_eq!(app.relay_test.times_asked(url), 1, "{url} is tested once");
    }
}

// US-D22
#[tokio::test]
async fn an_online_relay_has_its_profile_replaced_and_an_online_check_created() {
    let repository = FakeRepository::with_relays(&[("r1", "url1")]);
    let test = FakeTest::answering("url1", vec![Some(online("Relay One"))]);
    let app = App::new(repository, test);

    app.check_relays(3).await;

    assert_eq!(
        app.relay_repository.profiles(),
        [("r1".to_string(), profile("Relay One"))]
    );
    assert_eq!(
        app.relay_repository.checks(),
        [("r1".to_string(), online("Relay One"))]
    );
    assert_eq!(app.relay_test.times_asked("url1"), 1, "a found check is not asked again");
}

// US-D23
#[tokio::test]
async fn an_offline_relay_has_an_offline_check_created_and_its_profile_left_as_it_is() {
    let repository = FakeRepository::with_relays(&[("r1", "url1")]);
    let test = FakeTest::answering("url1", vec![Some(RelayCheck::Offline)]);
    let app = App::new(repository, test);

    app.check_relays(3).await;

    assert_eq!(
        app.relay_repository.checks(),
        [("r1".to_string(), RelayCheck::Offline)]
    );
    assert!(
        app.relay_repository.profiles().is_empty(),
        "an offline check writes no profile"
    );
    assert_eq!(app.relay_test.times_asked("url1"), 1, "an offline answer is an answer");
}

// US-D22, US-D23
#[tokio::test]
async fn a_test_that_could_not_be_asked_is_asked_again_and_the_answer_is_written() {
    let repository = FakeRepository::with_relays(&[("r1", "url1")]);
    let test = FakeTest::answering("url1", vec![None, None, Some(online("Relay One"))]);
    let app = App::new(repository, test);

    app.check_relays(3).await;

    assert_eq!(app.relay_test.times_asked("url1"), 3);
    assert_eq!(
        app.relay_repository.checks(),
        [("r1".to_string(), online("Relay One"))]
    );
    assert_eq!(
        app.relay_repository.profiles(),
        [("r1".to_string(), profile("Relay One"))]
    );
}

// US-D22, US-D23
#[tokio::test]
async fn a_test_that_could_not_be_asked_once_and_retry_count_times_again_writes_nothing() {
    let repository = FakeRepository::with_relays(&[("r1", "url1"), ("r2", "url2")]);
    let test = FakeTest::answering("url1", vec![None, None, None, None, Some(online("late"))])
        .also("url2", vec![Some(RelayCheck::Offline)]);
    let app = App::new(repository, test);

    app.check_relays(3).await;

    assert_eq!(app.relay_test.times_asked("url1"), 4, "asked once and retry_count times again, no more");
    assert_eq!(
        app.relay_repository.checks(),
        [("r2".to_string(), RelayCheck::Offline)],
        "nothing is written for the relay that could not be asked, and the others are not held up"
    );
    assert!(app.relay_repository.profiles().is_empty());
}
