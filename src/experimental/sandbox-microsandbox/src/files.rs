use futures_util::stream;
use microsandbox::sandbox::{FsEntryKind, FsMetadata, FsSetAttrs, SandboxFsOps};
use sandbox::{Error, SandboxId, SandboxPath, file_transfer::ByteReader};
use tokio::io::AsyncReadExt as _;
use tokio_util::io::StreamReader;

use crate::backend::MicrosandboxProvider;

impl MicrosandboxProvider {
    pub(crate) async fn read_file_stream(
        &self,
        sandbox_id: &SandboxId,
        path: &SandboxPath,
    ) -> Result<ByteReader, Error> {
        let record = self.state.sandbox_by_id(sandbox_id).await?;
        let runtime = self.connect_running(&record).await?;
        let source = runtime
            .fs()
            .read_stream(path.as_str())
            .await
            .map_err(crate::error::microsandbox)?;
        let chunks = stream::try_unfold(source, |mut source| async move {
            source
                .recv()
                .await
                .map(|chunk| chunk.map(|bytes| (bytes, source)))
                .map_err(std::io::Error::other)
        });
        Ok(Box::pin(StreamReader::new(chunks)))
    }

    /// Replaces the file atomically: the contents stream into a hidden sibling, which is renamed
    /// over the destination once complete, so a concurrent reader sees the old or the new file
    /// and never a truncated or partially written one. A replaced regular file keeps its mode
    /// and owner; a new file is created with the guest supervisor's defaults.
    pub(crate) async fn write_file_stream(
        &self,
        sandbox_id: &SandboxId,
        path: &SandboxPath,
        contents: ByteReader,
    ) -> Result<(), Error> {
        let record = self.state.sandbox_by_id(sandbox_id).await?;
        let runtime = self.connect_running(&record).await?;
        let fs = runtime.fs();
        let target = path.as_str();
        let existing = existing_regular_file(&fs, target).await?;
        let staging = staging_path(target);
        let replaced = match stage(&fs, &staging, existing.as_ref(), contents).await {
            Ok(()) => fs.rename(&staging, target).await.map_err(crate::error::microsandbox),
            Err(error) => Err(error),
        };
        if replaced.is_err() {
            // Best effort: the staging file is garbage once the write or rename failed, and the
            // original error is what the caller needs to see.
            let _ = fs.remove(&staging).await;
        }
        replaced
    }
}

async fn existing_regular_file(fs: &SandboxFsOps<'_>, path: &str) -> Result<Option<FsMetadata>, Error> {
    if !fs.exists(path).await.map_err(crate::error::microsandbox)? {
        return Ok(None);
    }
    let metadata = fs.stat(path).await.map_err(crate::error::microsandbox)?;
    Ok(matches!(metadata.kind, FsEntryKind::File).then_some(metadata))
}

async fn stage(
    fs: &SandboxFsOps<'_>,
    staging: &str,
    existing: Option<&FsMetadata>,
    mut contents: ByteReader,
) -> Result<(), Error> {
    let destination = fs.write_stream(staging).await.map_err(crate::error::microsandbox)?;
    let mut buffer = vec![0_u8; 64 * 1024].into_boxed_slice();
    loop {
        let read = contents
            .read(&mut buffer)
            .await
            .map_err(|source| crate::error::io("read runtime file-transfer input", source))?;
        if read == 0 {
            break;
        }
        destination
            .write(&buffer[..read])
            .await
            .map_err(crate::error::microsandbox)?;
    }
    destination.close().await.map_err(crate::error::microsandbox)?;
    if let Some(existing) = existing {
        // Ownership first: chown clears set-user-ID and set-group-ID bits, so the mode must be
        // applied afterwards for the replacement to keep them.
        let ownership = FsSetAttrs {
            uid: Some(existing.uid),
            gid: Some(existing.gid),
            ..FsSetAttrs::default()
        };
        fs.set_stat(staging, false, ownership)
            .await
            .map_err(crate::error::microsandbox)?;
        let mode = FsSetAttrs {
            mode: Some(existing.mode),
            ..FsSetAttrs::default()
        };
        fs.set_stat(staging, false, mode)
            .await
            .map_err(crate::error::microsandbox)?;
    }
    Ok(())
}

/// A hidden sibling in the destination's directory, so the final rename stays on one file system
/// and directory listings that skip dotfiles never show the staging file.
fn staging_path(target: &str) -> String {
    let (directory, name) = target.rsplit_once('/').unwrap_or(("", target));
    format!("{directory}/.{name}.agent-{}.tmp", uuid::Uuid::new_v4())
}

#[cfg(test)]
mod tests {
    use super::staging_path;

    #[test]
    fn staging_path_is_a_hidden_sibling() {
        let staging = staging_path("/home/agent/.claude/skills/evidence/SKILL.md");
        let (directory, name) = staging.rsplit_once('/').expect("directory");
        assert_eq!(directory, "/home/agent/.claude/skills/evidence");
        assert!(name.starts_with(".SKILL.md.agent-"));
        assert_eq!(std::path::Path::new(name).extension(), Some("tmp".as_ref()));
    }
}
