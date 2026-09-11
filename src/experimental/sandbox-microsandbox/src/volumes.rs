use sandbox::{Error, volume};

use crate::{backend::MicrosandboxProvider, error, state::VolumeRecord};

impl MicrosandboxProvider {
    pub(crate) async fn ensure_volume_record(
        &self,
        request: volume::EnsureVolumeRequest,
    ) -> Result<volume::Volume, Error> {
        let (id, name) = request.into_parts();
        let record = match self.state.volume_by_name(&name).await {
            Ok(record) => record,
            Err(error) if error.is_not_found() => {
                let record = VolumeRecord::new(id, name);
                self.state.save_volume(&record).await?;
                record
            }
            Err(error) => return Err(error),
        };
        self.ensure_volume_runtime(&record).await?;
        Ok(record.to_volume())
    }

    pub(crate) async fn delete_volume_record(&self, id: &volume::VolumeId) -> Result<(), Error> {
        let record = self.state.volume_by_id(id).await?;
        match self.client.scope(microsandbox::Volume::get(&record.runtime_name)).await {
            Ok(handle) => handle.remove().await.map_err(error::microsandbox)?,
            Err(microsandbox::MicrosandboxError::VolumeNotFound(_)) => {}
            Err(failure) => return Err(error::microsandbox(failure)),
        }
        self.state.remove_volume(&record).await
    }

    pub(crate) async fn ensure_volume_runtime(&self, record: &VolumeRecord) -> Result<(), Error> {
        match self.client.scope(microsandbox::Volume::get(&record.runtime_name)).await {
            Ok(_) => return Ok(()),
            Err(microsandbox::MicrosandboxError::VolumeNotFound(_)) => {}
            Err(failure) => return Err(error::microsandbox(failure)),
        }
        self.client
            .scope(microsandbox::Volume::builder(&record.runtime_name).directory().create())
            .await
            .map(|_| ())
            .map_err(error::microsandbox)
    }
}

impl VolumeRecord {
    pub(crate) fn to_volume(&self) -> volume::Volume {
        volume::Volume {
            id: self.id.clone(),
            name: self.name.clone(),
        }
    }
}
