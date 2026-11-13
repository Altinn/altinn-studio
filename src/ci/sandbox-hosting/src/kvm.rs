use std::{fs::OpenOptions, io};

/// Checks that this process can open `/dev/kvm`. The process must open it to start Sandboxes.
///
/// # Errors
///
/// Returns an error when `/dev/kvm` does not exist, or when this process cannot read and write it.
pub fn require_kvm() -> Result<(), io::Error> {
    OpenOptions::new()
        .read(true)
        .write(true)
        .open("/dev/kvm")
        .map(|_| ())
        .map_err(|error| io::Error::new(error.kind(), format!("cannot open /dev/kvm: {error}")))
}
