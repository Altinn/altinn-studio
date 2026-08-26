use sandbox::{Error, Platform};

pub(crate) fn require_supported(requested: &Platform) -> Result<Platform, Error> {
    let actual = Platform::native("linux");
    let host_supported = host_supported(std::env::consts::OS, std::env::consts::ARCH);
    let unconstrained =
        requested.variant.is_none() && requested.os_version.is_none() && requested.os_features.is_empty();

    if host_supported && actual.satisfies(requested) && unconstrained {
        Ok(actual)
    } else {
        Err(Error::UnsupportedPlatform(requested.clone()))
    }
}

pub(crate) fn host_supported(os: &str, architecture: &str) -> bool {
    crate::client::runtime_sha256(os, architecture).is_some()
}

#[cfg(test)]
mod tests {
    use sandbox::Platform;

    #[test]
    fn supports_only_the_native_unconstrained_linux_platform() {
        let native = Platform::native("linux");
        let expected_support = super::host_supported(std::env::consts::OS, std::env::consts::ARCH);
        assert_eq!(super::require_supported(&native).is_ok(), expected_support);

        assert!(super::require_supported(&Platform::native("windows")).is_err());
        assert!(super::require_supported(&Platform::new("linux", "different-architecture")).is_err());
    }

    #[test]
    fn supports_only_hosts_with_a_pinned_runtime_release() {
        for (os, architecture) in [
            ("linux", "x86_64"),
            ("linux", "aarch64"),
            ("macos", "aarch64"),
            ("windows", "x86_64"),
            ("windows", "aarch64"),
        ] {
            assert!(super::host_supported(os, architecture));
        }

        for (os, architecture) in [
            ("linux", "riscv64"),
            ("macos", "x86_64"),
            ("windows", "x86"),
            ("freebsd", "x86_64"),
        ] {
            assert!(!super::host_supported(os, architecture));
        }
    }
}
