use std::{
    cell::RefCell,
    fmt::Write as _,
    fs::File,
    io::{self, Read as _},
    rc::Rc,
    time::Duration,
};

use hyper::upgrade::Upgraded;
use hyper_util::rt::TokioIo;
use sandbox_authorization::LocalFuture;
use sandbox_host::AnyError;
use sandbox_microsandbox::{GuestTcpDialer, MicrosandboxProvider};
use serde::Serialize;
use tokio::time::Instant;

use crate::{
    output::{Captured, Ending, Limits},
    slot::{Slot, SlotGuard},
    vm::{Vm, Vms},
};

/// The user that the client logs in as. The jobs run as this user.
pub const SSH_USER: &str = "app-build";

const SSH_PORT: u16 = 2222;
const SETUP_TIMEOUT: Duration = Duration::from_mins(1);
const MAX_KEY_BYTES: u64 = 16 * 1024;
const SETUP_LIMITS: Limits = Limits {
    stdout: 64 * 1024,
    stderr: 64 * 1024,
};

/// Makes the keys of the VM, and starts sshd as the job user on the guest loopback. sshd listens before it returns.
/// The client key opens only this VM, where app code already runs as the same user, so the VM can keep its copy.
const SETUP_SCRIPT: &str = "set -eu
mkdir /job/ssh
cd /job/ssh
ssh-keygen -q -t ed25519 -N '' -C host -f host_key
ssh-keygen -q -t ed25519 -N '' -C client -f client_key
cp client_key.pub authorized_keys
chmod 600 authorized_keys
cat > sshd_config <<'EOF'
ListenAddress 127.0.0.1:2222
HostKey /job/ssh/host_key
AuthorizedKeysFile /job/ssh/authorized_keys
PidFile /job/ssh/sshd.pid
AllowUsers app-build
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
UsePAM no
PermitUserEnvironment yes
AllowTcpForwarding no
AllowAgentForwarding no
AllowStreamLocalForwarding no
X11Forwarding no
PermitTunnel no
EOF
/usr/sbin/sshd -f /job/ssh/sshd_config -E /job/ssh/sshd.log";

/// What the client needs to log in to a VM.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SshAccess {
    pub id: String,
    /// The public host key, for `known_hosts`.
    pub host_key: String,
    /// A private key that only this VM accepts.
    pub client_key: String,
    pub user: &'static str,
}

/// VMs that a client reaches with ssh. The routes use this trait, so that the tests can use a fake.
pub trait SshVms {
    /// Starts a VM with sshd, or returns `None` when a VM is in use.
    fn start(&self) -> LocalFuture<'_, Result<Option<SshAccess>, AnyError>>;

    fn contains(&self, id: &str) -> bool;

    /// Copies bytes between the client and sshd in the VM, until both sides close.
    fn relay<'a>(&'a self, id: &'a str, client: Upgraded) -> LocalFuture<'a, Result<(), AnyError>>;

    /// Deletes the VM. Returns `false` when no VM has the id.
    fn delete<'a>(&'a self, id: &'a str) -> LocalFuture<'a, bool>;
}

/// One VM at a time, started from the guest image.
pub struct SandboxSshVms {
    vms: Vms,
    provider: Rc<MicrosandboxProvider>,
    slot: Slot,
    running: RefCell<Option<Running>>,
}

struct Running {
    id: String,
    vm: Vm,
    dialer: Rc<GuestTcpDialer>,
    _slot: SlotGuard,
}

impl SandboxSshVms {
    #[must_use]
    pub const fn new(vms: Vms, provider: Rc<MicrosandboxProvider>, slot: Slot) -> Self {
        Self {
            vms,
            provider,
            slot,
            running: RefCell::new(None),
        }
    }

    async fn start_vm(&self, slot: SlotGuard) -> Result<SshAccess, AnyError> {
        let vm = self.vms.start().await?;
        match self.open_ssh(&vm).await {
            Ok((access, dialer)) => {
                *self.running.borrow_mut() = Some(Running {
                    id: access.id.clone(),
                    vm,
                    dialer: Rc::new(dialer),
                    _slot: slot,
                });
                Ok(access)
            }
            Err(error) => {
                delete_or_exit(vm).await;
                Err(error)
            }
        }
    }

    async fn open_ssh(&self, vm: &Vm) -> Result<(SshAccess, GuestTcpDialer), AnyError> {
        start_sshd(vm).await?;
        let access = SshAccess {
            id: new_id()?,
            host_key: read_key(vm, "/job/ssh/host_key.pub").await?.trim().to_string(),
            client_key: read_key(vm, "/job/ssh/client_key").await?,
            user: SSH_USER,
        };
        let dialer = self.provider.guest_tcp_dialer(vm.id()).await?;
        Ok((access, dialer))
    }

    fn dialer(&self, id: &str) -> Option<Rc<GuestTcpDialer>> {
        self.running
            .borrow()
            .as_ref()
            .filter(|running| running.id == id)
            .map(|running| running.dialer.clone())
    }
}

impl SshVms for SandboxSshVms {
    fn start(&self) -> LocalFuture<'_, Result<Option<SshAccess>, AnyError>> {
        Box::pin(async move {
            let Some(slot) = self.slot.take() else {
                return Ok(None);
            };
            self.start_vm(slot).await.map(Some)
        })
    }

    fn contains(&self, id: &str) -> bool {
        self.dialer(id).is_some()
    }

    fn relay<'a>(&'a self, id: &'a str, client: Upgraded) -> LocalFuture<'a, Result<(), AnyError>> {
        Box::pin(async move {
            let dialer = self
                .dialer(id)
                .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "no VM has this id"))?;
            let guest = dialer.connect("127.0.0.1", SSH_PORT).await?;
            let (reader, writer) = tokio::io::split(TokioIo::new(client));
            guest.relay_io(reader, writer).await.map_err(Into::into)
        })
    }

    fn delete<'a>(&'a self, id: &'a str) -> LocalFuture<'a, bool> {
        Box::pin(async move {
            let running = self.running.borrow_mut().take_if(|running| running.id == id);
            let Some(Running { vm, dialer, _slot, .. }) = running else {
                return false;
            };
            drop(dialer);
            delete_or_exit(vm).await;
            true
        })
    }
}

async fn start_sshd(vm: &Vm) -> Result<(), AnyError> {
    let setup = vm
        .run_script(SETUP_SCRIPT, Instant::now() + SETUP_TIMEOUT, SETUP_LIMITS)
        .await?;
    if setup.ending == Ending::Exited(0) {
        Ok(())
    } else {
        Err(io::Error::other(format!("sshd did not start: {}", to_text(&setup.stderr))).into())
    }
}

/// A restart clears the Provider home, so a VM that cannot be deleted cannot hold the slot of the next VM.
async fn delete_or_exit(vm: Vm) {
    if let Err(error) = vm.delete().await {
        tracing::error!(%error, "could not delete a VM, so the runner stops");
        std::process::exit(1);
    }
}

async fn read_key(vm: &Vm, path: &str) -> Result<String, AnyError> {
    let key = vm
        .read_file(path, MAX_KEY_BYTES)
        .await?
        .ok_or_else(|| io::Error::other(format!("{path} is too large")))?;
    Ok(String::from_utf8(key)?)
}

fn to_text(captured: &Captured) -> String {
    String::from_utf8_lossy(captured.bytes()).trim().to_string()
}

/// A random id, so that a client cannot guess the id of a VM that another client started.
fn new_id() -> Result<String, io::Error> {
    let mut bytes = [0_u8; 16];
    File::open("/dev/urandom")?.read_exact(&mut bytes)?;
    Ok(bytes.iter().fold(String::new(), |mut id, byte| {
        let _ = write!(id, "{byte:02x}");
        id
    }))
}
