use std::{fs::OpenOptions, io};

/// Checks that this process can open `/dev/kvm`, so that it can start Sandboxes.
///
/// # Errors
///
/// Returns an error when `/dev/kvm` does not exist or this process has no read and write access to it.
pub fn require_kvm() -> Result<(), io::Error> {
    OpenOptions::new()
        .read(true)
        .write(true)
        .open("/dev/kvm")
        .map(|_| ())
        .map_err(|error| io::Error::new(error.kind(), format!("cannot open /dev/kvm: {error}")))
}
