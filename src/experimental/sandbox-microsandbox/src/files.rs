use futures_util::stream;
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

    pub(crate) async fn write_file_stream(
        &self,
        sandbox_id: &SandboxId,
        path: &SandboxPath,
        mut contents: ByteReader,
    ) -> Result<(), Error> {
        let record = self.state.sandbox_by_id(sandbox_id).await?;
        let runtime = self.connect_running(&record).await?;
        let destination = runtime
            .fs()
            .write_stream(path.as_str())
            .await
            .map_err(crate::error::microsandbox)?;
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
        destination.close().await.map_err(crate::error::microsandbox)
    }
}
