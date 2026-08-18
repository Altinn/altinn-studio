use sandbox::{Error, Platform};

pub(crate) fn require_supported(requested: &Platform) -> Result<Platform, Error> {
    let actual = Platform::new("linux", sandbox_architecture());
    let host_supported = matches!(std::env::consts::OS, "linux" | "windows")
        || (std::env::consts::OS == "macos" && std::env::consts::ARCH == "aarch64");
    let unconstrained =
        requested.variant.is_none() && requested.os_version.is_none() && requested.os_features.is_empty();

    if host_supported && actual.satisfies(requested) && unconstrained {
        Ok(actual)
    } else {
        Err(Error::UnsupportedPlatform(requested.clone()))
    }
}

fn sandbox_architecture() -> &'static str {
    match std::env::consts::ARCH {
        "x86_64" => "amd64",
        "aarch64" => "arm64",
        architecture => architecture,
    }
}

#[cfg(test)]
mod tests {
    use sandbox::Platform;

    #[test]
    fn supports_only_the_native_unconstrained_linux_platform() {
        let native = Platform::new("linux", super::sandbox_architecture());
        let expected_support = matches!(std::env::consts::OS, "linux" | "windows")
            || (std::env::consts::OS == "macos" && std::env::consts::ARCH == "aarch64");
        assert_eq!(super::require_supported(&native).is_ok(), expected_support);

        assert!(super::require_supported(&Platform::new("windows", super::sandbox_architecture())).is_err());
        assert!(super::require_supported(&Platform::new("linux", "different-architecture")).is_err());
    }
}
