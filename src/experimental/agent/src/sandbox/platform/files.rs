//! Convergent file placement for Agent setup.
//!
//! Setup reruns on every reconciliation pass, so a file the Agent's harness watches must not be
//! rewritten unless its contents changed: every write is a new inode the harness reloads. The
//! Sandbox SDK makes each write atomic; this module additionally skips writes that would not
//! change anything.
//!
//! The files compared here are writable by the Sandbox user, so every read is bounded: a file
//! grown or redirected to something unbounded counts as changed and is replaced.

use std::io::Cursor;

use ::sandbox::{SandboxHandle, SandboxPath};
use tokio::io::AsyncReadExt as _;

use crate::Error;

/// Reads up to `limit` bytes of a Sandbox file, or `None` when it cannot be read or is longer.
///
/// Any read failure counts as absent: the following write reports the real problem if the
/// file is genuinely inaccessible.
pub(crate) async fn read_existing(sandbox: &SandboxHandle, path: &str, limit: usize) -> Option<Vec<u8>> {
    let reader = sandbox.read_file(&SandboxPath::new(path)).await.ok()?;
    let mut contents = Vec::new();
    let bound = u64::try_from(limit).ok()?.checked_add(1)?;
    reader.take(bound).read_to_end(&mut contents).await.ok()?;
    (contents.len() <= limit).then_some(contents)
}

/// Writes `contents` to `path` unless the file already holds exactly those bytes.
///
/// Returns whether the file was written.
///
/// # Errors
///
/// Returns an error when the Sandbox cannot write the file.
pub(crate) async fn write_if_changed(sandbox: &SandboxHandle, path: &str, contents: &[u8]) -> Result<bool, Error> {
    if read_existing(sandbox, path, contents.len()).await.as_deref() == Some(contents) {
        return Ok(false);
    }
    sandbox
        .write_file(&SandboxPath::new(path), Box::pin(Cursor::new(contents.to_vec())))
        .await?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use std::rc::Rc;

    use ::sandbox::{
        EnsureSandboxRequest, Platform, RootFilesystem, SandboxHandle, SandboxName, SandboxPath, SandboxResources,
        SandboxService, SandboxSpec, image::ImageSource, memory,
    };

    use super::{read_existing, write_if_changed};

    async fn sandbox() -> (Rc<memory::Provider>, SandboxHandle) {
        let backend = Rc::new(memory::Provider::new());
        let service = SandboxService::new(backend.clone());
        let spec = SandboxSpec {
            image: ImageSource::Build {
                context: std::path::PathBuf::from("."),
                dockerfile: std::path::PathBuf::from("Dockerfile"),
            },
            platform: Platform::native("linux"),
            resources: SandboxResources::new(
                "1".parse().expect("CPU"),
                "512Mi".parse().expect("memory"),
                RootFilesystem::layered("1Gi".parse().expect("root filesystem")),
            ),
            init_system: ::sandbox::init::InitSystem::Backend,
            retention_policy: ::sandbox::RetentionPolicy::Retain,
        };
        let sandbox = service
            .ensure(&EnsureSandboxRequest::new(
                SandboxName::new("files").expect("Sandbox name"),
                spec,
            ))
            .await
            .expect("Sandbox");
        (backend, sandbox)
    }

    #[tokio::test(flavor = "local")]
    async fn identical_contents_are_not_rewritten() {
        let (backend, sandbox) = sandbox().await;
        assert!(
            write_if_changed(&sandbox, "/etc/agent.conf", b"one")
                .await
                .expect("write")
        );
        assert!(
            !write_if_changed(&sandbox, "/etc/agent.conf", b"one")
                .await
                .expect("compare")
        );
        assert!(
            write_if_changed(&sandbox, "/etc/agent.conf", b"two")
                .await
                .expect("rewrite")
        );
        assert_eq!(backend.file_writes().len(), 2);
    }

    #[tokio::test(flavor = "local")]
    async fn reads_stop_at_the_bound() {
        let (_, sandbox) = sandbox().await;
        sandbox
            .write_file(
                &SandboxPath::new("/etc/large"),
                Box::pin(std::io::Cursor::new(vec![b'x'; 1024])),
            )
            .await
            .expect("write");
        assert_eq!(
            read_existing(&sandbox, "/etc/large", 1024).await,
            Some(vec![b'x'; 1024])
        );
        assert_eq!(read_existing(&sandbox, "/etc/large", 1023).await, None);
        assert_eq!(read_existing(&sandbox, "/etc/missing", 1024).await, None);
        // A longer file than the desired contents is different without reading it all.
        assert!(
            write_if_changed(&sandbox, "/etc/large", b"short")
                .await
                .expect("rewrite")
        );
    }
}
