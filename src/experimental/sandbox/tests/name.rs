#![allow(clippy::expect_used)]

use sandbox::{InvalidSandboxName, MAX_SANDBOX_NAME_BYTES, SandboxName};

#[test]
fn accepts_portable_dns_labels() {
    for value in ["a", "0", "worker-1", "a1-b2"] {
        let name = SandboxName::new(value).expect("portable name should be accepted");
        assert_eq!(name.as_str(), value);
    }

    let maximum = "a".repeat(MAX_SANDBOX_NAME_BYTES);
    assert_eq!(
        SandboxName::new(&maximum)
            .expect("maximum-length name should be accepted")
            .as_str(),
        maximum
    );
}

#[test]
fn rejects_names_outside_the_portable_subset() {
    assert_eq!(SandboxName::new(""), Err(InvalidSandboxName::Empty));
    assert_eq!(
        SandboxName::new("a".repeat(MAX_SANDBOX_NAME_BYTES + 1)),
        Err(InvalidSandboxName::TooLong {
            length: MAX_SANDBOX_NAME_BYTES + 1
        })
    );

    for value in ["Worker", "worker_name", "worker.name", "-worker", "worker-", "wørker"] {
        assert_eq!(
            SandboxName::new(value),
            Err(InvalidSandboxName::InvalidSyntax),
            "{value:?} should be rejected"
        );
    }
}

#[test]
fn deserialization_cannot_bypass_validation() {
    let name: SandboxName = serde_json::from_str(r#""worker-1""#).expect("valid name should deserialize");
    assert_eq!(name.as_str(), "worker-1");
    assert!(serde_json::from_str::<SandboxName>(r#""Worker_1""#).is_err());
    assert_eq!(
        serde_json::to_string(&name).expect("name should serialize"),
        r#""worker-1""#
    );
}
