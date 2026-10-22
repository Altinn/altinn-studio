use std::io;

/// Checks that `SANDBOX_IMAGE` names an image by its sha256 digest, so that every Sandbox starts the same image.
///
/// # Errors
///
/// Returns an error when the reference has no repository or no valid sha256 digest.
pub fn validate_immutable_image_reference(reference: &str) -> Result<(), io::Error> {
    let Some((repository, digest)) = reference.rsplit_once("@sha256:") else {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "SANDBOX_IMAGE must be pinned by sha256 digest",
        ));
    };
    if repository.is_empty() || digest.len() != 64 || !digest.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "SANDBOX_IMAGE must contain a repository and a 64-character sha256 digest",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate_immutable_image_reference;

    #[test]
    fn accepts_digest_pinned_image() {
        let reference = format!("registry.example/runner@sha256:{}", "a".repeat(64));
        assert!(validate_immutable_image_reference(&reference).is_ok());
    }

    #[test]
    fn rejects_tagged_or_malformed_image() {
        for reference in [
            "registry.example/runner:latest",
            "registry.example/runner@sha256:abc",
            "@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "registry.example/runner@sha256:gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg",
        ] {
            assert!(validate_immutable_image_reference(reference).is_err());
        }
    }
}
