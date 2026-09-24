//! Ed25519 key pairs in OpenSSH encoding.

use ssh_key::{Algorithm, LineEnding, PrivateKey, rand_core::OsRng};
use zeroize::Zeroizing;

use crate::Error;

/// One freshly generated or decoded key pair in OpenSSH encoding.
pub struct KeyPair {
    /// The private key in OpenSSH private key format, ending in a newline.
    pub private: Zeroizing<String>,
    /// The public key as one `authorized_keys`/`known_hosts` entry without a trailing newline.
    pub public: String,
}

impl KeyPair {
    /// Generates an Ed25519 key pair with the host's operating system randomness.
    ///
    /// # Errors
    ///
    /// Returns an error when the key cannot be generated or encoded.
    pub fn generate_ed25519(comment: &str) -> Result<Self, Error> {
        let mut key = PrivateKey::random(&mut OsRng, Algorithm::Ed25519).map_err(|error| key_error(&error))?;
        key.set_comment(comment);
        Self::from_private(&key)
    }

    /// Decodes an OpenSSH private key and derives its public entry.
    ///
    /// # Errors
    ///
    /// Returns an error when the bytes are not an unencrypted OpenSSH private key.
    pub fn from_openssh(private: &[u8]) -> Result<Self, Error> {
        let key = PrivateKey::from_openssh(private).map_err(|error| key_error(&error))?;
        Self::from_private(&key)
    }

    fn from_private(key: &PrivateKey) -> Result<Self, Error> {
        let private = key.to_openssh(LineEnding::LF).map_err(|error| key_error(&error))?;
        let public = key.public_key().to_openssh().map_err(|error| key_error(&error))?;
        Ok(Self {
            private: Zeroizing::new(private.to_string()),
            public,
        })
    }
}

fn key_error(error: &ssh_key::Error) -> Error {
    Error::Daemon(format!("SSH key operation failed: {error}"))
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::KeyPair;

    #[test]
    fn generated_keys_are_openssh_ed25519() {
        let pair = KeyPair::generate_ed25519("agent-test").expect("key pair");
        assert!(pair.private.starts_with("-----BEGIN OPENSSH PRIVATE KEY-----\n"));
        assert!(pair.private.ends_with("-----END OPENSSH PRIVATE KEY-----\n"));
        assert!(pair.public.starts_with("ssh-ed25519 AAAA"));
        assert!(pair.public.ends_with(" agent-test"));
        assert!(!pair.public.contains('\n'));

        let decoded = KeyPair::from_openssh(pair.private.as_bytes()).expect("decode");
        assert_eq!(decoded.public, pair.public);
        assert_ne!(
            KeyPair::generate_ed25519("other").expect("second pair").public,
            pair.public
        );
    }
}
