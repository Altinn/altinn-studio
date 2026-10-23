use std::{io, time::Duration};

use bytes::Bytes;
use clap::Args;
use sandbox::{
    ByteQuantity, CpuQuantity, EnsureSandboxRequest, RetentionPolicy, RootFilesystem, SandboxHandle, SandboxName,
    SandboxPath, SandboxResources, SandboxService, SandboxSpec,
    execution::{ExecutionSpec, StartExecutionRequest},
    image::ImageSource,
    init::InitSystem,
};
use sandbox_host::{AnyError, native_linux_platform, validate_immutable_image_reference};
use tokio::{io::AsyncReadExt as _, time::Instant};

use crate::output::{Collected, Limits, collect};

/// The folder of the job in the guest. The guest image gives it to the job user.
const JOB_FOLDER: &str = "/job";
const VM_NAME: &str = "job";

const DELETE_TIMEOUT: Duration = Duration::from_mins(1);

/// The guest image and the size of the VM. The `PodTemplate` sets them, next to the resources of the pod that holds the
/// VM, so they have no defaults here.
#[derive(Args)]
pub struct VmArguments {
    /// Digest-pinned guest image with the .NET SDK, git and studioctl.
    #[arg(long, env = "SANDBOX_IMAGE")]
    image: String,

    /// Virtual CPUs of the VM.
    #[arg(long, env = "SANDBOX_CPUS")]
    cpus: CpuQuantity,

    /// Memory of the VM.
    #[arg(long, env = "SANDBOX_MEMORY")]
    memory: ByteQuantity,

    /// Size of the private root file system of the VM.
    #[arg(long, env = "SANDBOX_ROOT_FILESYSTEM")]
    root_filesystem: ByteQuantity,
}

/// Starts the VM of the job from the guest image.
pub struct Vms {
    service: SandboxService,
    arguments: VmArguments,
}

/// One running VM. Delete it with [`Vm::delete`] when the job ends.
pub struct Vm {
    handle: SandboxHandle,
}

impl Vms {
    /// # Errors
    ///
    /// Returns an error when the guest image is not pinned by digest.
    pub fn new(service: SandboxService, arguments: VmArguments) -> Result<Self, io::Error> {
        validate_immutable_image_reference(&arguments.image)?;
        Ok(Self { service, arguments })
    }

    /// Starts a new VM. A failed start deletes what it made.
    ///
    /// # Errors
    ///
    /// Returns an error when the VM does not start.
    pub async fn start(&self) -> Result<Vm, AnyError> {
        let name = SandboxName::new(VM_NAME)?;
        let request = EnsureSandboxRequest::new(name.clone(), self.spec());
        match self.service.ensure(&request).await {
            Ok(handle) => Ok(Vm { handle }),
            Err(error) => {
                if let Err(cleanup) = with_delete_timeout(self.service.delete(&name)).await {
                    tracing::warn!(%cleanup, vm = %name, "could not delete a VM that did not start");
                }
                Err(error.into())
            }
        }
    }

    fn spec(&self) -> SandboxSpec {
        SandboxSpec {
            image: ImageSource::Reference {
                reference: self.arguments.image.clone(),
            },
            platform: native_linux_platform(),
            resources: SandboxResources::new(
                self.arguments.cpus,
                self.arguments.memory,
                RootFilesystem::direct(self.arguments.root_filesystem),
            ),
            init_system: InitSystem::Backend,
            retention_policy: RetentionPolicy::Delete,
        }
    }
}

impl Vm {
    /// Writes a file in the guest.
    ///
    /// # Errors
    ///
    /// Returns an error when the file cannot be written.
    pub async fn write_file(&self, path: &str, contents: Bytes) -> Result<(), AnyError> {
        self.handle
            .write_file(&SandboxPath::new(path), Box::pin(io::Cursor::new(contents)))
            .await
            .map_err(Into::into)
    }

    /// Reads a file in the guest.
    ///
    /// # Errors
    ///
    /// Returns an error when the file cannot be read, or when it is larger than `limit` bytes.
    pub async fn read_file(&self, path: &str, limit: u64) -> Result<Vec<u8>, AnyError> {
        let mut contents = Vec::new();
        self.handle
            .read_file(&SandboxPath::new(path))
            .await?
            .take(limit + 1)
            .read_to_end(&mut contents)
            .await?;
        if contents.len() as u64 > limit {
            return Err(io::Error::other(format!("{path} is larger than {limit} bytes")).into());
        }
        Ok(contents)
    }

    /// Runs a shell script as the job user in [`JOB_FOLDER`], with the environment of the guest image.
    ///
    /// # Errors
    ///
    /// Returns an error when the script does not start, or its events end before it exits.
    pub async fn run_script(&self, script: &str, deadline: Instant, limits: Limits) -> Result<Collected, AnyError> {
        let spec = ExecutionSpec::command(SandboxPath::new("/bin/sh"), ["-c".to_string(), script.to_string()])
            .with_working_directory(SandboxPath::new(JOB_FOLDER));
        let mut started = self.handle.start_execution(StartExecutionRequest::new(spec)).await?;
        collect(&mut started.events, deadline, limits).await
    }

    /// Deletes the VM and all its files.
    ///
    /// # Errors
    ///
    /// Returns an error when the VM is not deleted within a minute.
    pub async fn delete(self) -> Result<(), AnyError> {
        with_delete_timeout(self.handle.delete()).await
    }
}

async fn with_delete_timeout(delete: impl Future<Output = Result<(), sandbox::Error>>) -> Result<(), AnyError> {
    tokio::time::timeout(DELETE_TIMEOUT, delete).await.map_or_else(
        |_| Err(io::Error::new(io::ErrorKind::TimedOut, "deleting the VM timed out").into()),
        |deleted| deleted.map_err(Into::into),
    )
}
