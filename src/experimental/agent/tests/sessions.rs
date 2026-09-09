#![allow(clippy::expect_used)]

use agent::sessions::{LaunchToken, SessionName};

#[test]
fn session_names_are_validated_at_construction_and_deserialization() {
    let name = SessionName::new("review_1").expect("portable Session name");
    assert_eq!(name.as_str(), "review_1");

    assert!(SessionName::new("contains spaces").is_err());
    assert!(serde_json::from_str::<SessionName>(r#""contains spaces""#).is_err());
}

#[test]
fn launch_tokens_are_typed_and_redacted() {
    let raw = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    let token = raw.parse::<LaunchToken>().expect("UUID launch token");

    assert_eq!(token, raw.parse::<LaunchToken>().expect("same UUID launch token"));
    assert_eq!(format!("{token:?}"), "LaunchToken([redacted])");
    assert!("not-a-token".parse::<LaunchToken>().is_err());
}
