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

/// The folder of the job in the guest. In the guest image, the job user owns this folder.
const JOB_FOLDER: &str = "/job";
const VM_NAME: &str = "job";

const DELETE_TIMEOUT: Duration = Duration::from_mins(1);

/// The guest image and the size of the VM. These values have no defaults here, because the `PodTemplate` sets them
/// together with the resources of the pod that contains the VM.
#[derive(Args)]
pub struct VmArguments {
    /// The guest image, pinned by digest, with the .NET SDK, git and studioctl.
    #[arg(long, env = "SANDBOX_IMAGE")]
    image: String,

    /// The number of virtual CPUs of the VM.
    #[arg(long, env = "SANDBOX_CPUS")]
    cpus: CpuQuantity,

    /// The memory of the VM.
    #[arg(long, env = "SANDBOX_MEMORY")]
    memory: ByteQuantity,

    /// The size of the private root file system of the VM.
    #[arg(long, env = "SANDBOX_ROOT_FILESYSTEM")]
    root_filesystem: ByteQuantity,
}

/// Starts the VM of the job from the guest image, and deletes the VM.
pub struct Vms {
    service: SandboxService,
    arguments: VmArguments,
}

/// A VM that runs. A drop does not delete the VM. The job host deletes it with [`Vms::delete`] when the job host
/// stops.
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

    /// Starts a new VM.
    ///
    /// # Errors
    ///
    /// Returns an error when the VM does not start.
    pub async fn start(&self) -> Result<Vm, AnyError> {
        let request = EnsureSandboxRequest::new(SandboxName::new(VM_NAME)?, self.spec());
        let handle = self.service.ensure(&request).await?;
        Ok(Vm { handle })
    }

    /// Deletes the VM and all its files, if the VM exists. It also deletes a VM that did not start completely, and a VM
    /// whose job did not complete.
    ///
    /// # Errors
    ///
    /// Returns an error when the delete fails, or when it does not complete in one minute.
    pub async fn delete(&self) -> Result<(), AnyError> {
        let name = SandboxName::new(VM_NAME)?;
        match tokio::time::timeout(DELETE_TIMEOUT, self.service.delete(&name)).await {
            Ok(deleted) => Ok(deleted?),
            Err(_) => Err(io::Error::new(io::ErrorKind::TimedOut, "deleting the VM timed out").into()),
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
    /// Returns an error when the write fails.
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
    /// Returns an error when the read fails, or when the file is larger than `limit` bytes.
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
    /// Returns an error when the script does not start, or when its events stop before the script exits.
    pub async fn run_script(&self, script: &str, deadline: Instant, limits: Limits) -> Result<Collected, AnyError> {
        let spec = ExecutionSpec::command(SandboxPath::new("/bin/sh"), ["-c".to_string(), script.to_string()])
            .with_working_directory(SandboxPath::new(JOB_FOLDER));
        let mut started = self.handle.start_execution(StartExecutionRequest::new(spec)).await?;
        collect(&mut started.events, deadline, limits).await
    }
}
