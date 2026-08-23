#![allow(clippy::expect_used)]

use agent::sessions::SessionName;

#[test]
fn session_names_are_validated_at_construction_and_deserialization() {
    let name = SessionName::new("review_1").expect("portable Session name");
    assert_eq!(name.as_str(), "review_1");

    assert!(SessionName::new("contains spaces").is_err());
    assert!(serde_json::from_str::<SessionName>(r#""contains spaces""#).is_err());
}
