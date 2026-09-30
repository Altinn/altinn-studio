use sandbox::{Error, ResourceKind};

pub(crate) fn microsandbox(error: microsandbox::MicrosandboxError) -> Error {
    match error {
        microsandbox::MicrosandboxError::SandboxNotFound(name) => Error::not_found(ResourceKind::Sandbox, &name),
        microsandbox::MicrosandboxError::ImageNotFound(reference) => Error::not_found(ResourceKind::Image, &reference),
        microsandbox::MicrosandboxError::VolumeNotFound(name) => Error::not_found(ResourceKind::Volume, &name),
        microsandbox::MicrosandboxError::ExecFailed(failure) => {
            Error::Backend(format!("Microsandbox execution failed: {}", failure.message))
        }
        error => Error::Backend(error.to_string()),
    }
}

pub(crate) fn backend(error: impl std::fmt::Display) -> Error {
    Error::Backend(error.to_string())
}

pub(crate) const fn io(operation: &'static str, source: std::io::Error) -> Error {
    Error::Io { operation, source }
}
