//! Nonblocking raw terminal input and resize signals on Unix.

use std::{ffi::OsStr, fs::File, io::Read as _, os::unix::ffi::OsStrExt as _, path::Path};

use agent::Error;
use tokio::io::unix::AsyncFd;

use super::{LocalInput, current_size};

pub(super) struct LocalEvents {
    input: AsyncFd<File>,
    resize: tokio::signal::unix::Signal,
    open: bool,
}

impl LocalEvents {
    pub(super) fn open() -> Result<Self, Error> {
        let terminal_path = rustix::termios::ttyname(std::io::stdin(), Vec::new())
            .map_err(|error| Error::Session(format!("resolve terminal device for stdin: {error}")))?;
        // Polling the /dev/tty alias with kqueue fails on macOS. Reopen the
        // actual terminal device so making it nonblocking also stays local to us.
        let terminal_path = Path::new(OsStr::from_bytes(terminal_path.to_bytes()));
        let input = File::open(terminal_path)
            .map_err(|error| Error::Session(format!("open terminal input {}: {error}", terminal_path.display())))?;
        let flags = rustix::fs::fcntl_getfl(&input).map_err(std::io::Error::from)?;
        rustix::fs::fcntl_setfl(&input, flags | rustix::fs::OFlags::NONBLOCK).map_err(std::io::Error::from)?;
        Ok(Self {
            input: AsyncFd::new(input)?,
            resize: tokio::signal::unix::signal(tokio::signal::unix::SignalKind::window_change())?,
            open: true,
        })
    }

    pub(super) const fn is_open(&self) -> bool {
        self.open
    }

    pub(super) const fn close(&mut self) {
        self.open = false;
    }

    pub(super) async fn next(&mut self) -> Result<LocalInput, Error> {
        loop {
            tokio::select! {
                ready = self.input.readable() => {
                    let mut ready = ready?;
                    let mut buffer = [0_u8; 4096];
                    match ready.try_io(|descriptor| {
                        let mut input = descriptor.get_ref();
                        input.read(&mut buffer)
                    }) {
                        Ok(Ok(0)) => return Ok(LocalInput::Close),
                        Ok(Ok(read)) => return Ok(LocalInput::Bytes(buffer[..read].to_vec())),
                        Ok(Err(error)) if error.kind() == std::io::ErrorKind::Interrupted => {}
                        Ok(Err(error)) => return Err(error.into()),
                        Err(_would_block) => {}
                    }
                }
                resized = self.resize.recv() => {
                    resized.ok_or_else(|| Error::Session("terminal resize signal stream ended".into()))?;
                    return current_size().map(LocalInput::Resize);
                }
            }
        }
    }
}
