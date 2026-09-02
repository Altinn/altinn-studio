use std::{cell::RefCell, collections::HashMap, rc::Rc};

use futures_util::stream;
use microsandbox::sandbox::{AttachOptionsBuilder, ExecOptionsBuilder};
use microsandbox::{ExecControl, ExecEvent};
use sandbox::{Error, LocalFuture, ResourceKind, SandboxId, execution, terminal};

use crate::{backend::MicrosandboxProvider, error};

type ExecutionKey = (SandboxId, execution::ExecutionId);
pub(crate) type ExecutionControls = Rc<RefCell<HashMap<ExecutionKey, ExecControl>>>;

// Microsandbox uses -1 when attachment ends before receiving a process exit.
const DETACHED_EXIT_CODE: i32 = -1;

impl MicrosandboxProvider {
    pub(crate) async fn start_execution_stream(
        &self,
        sandbox_id: &SandboxId,
        request: execution::StartExecutionRequest,
    ) -> Result<execution::StartedExecution, Error> {
        let (execution_id, spec) = request.into_parts();
        let sandbox = self.state.sandbox_by_id(sandbox_id).await?;
        let runtime = self.connect_running(&sandbox).await?;
        let handle = start_runtime_execution(&runtime, &spec)
            .await
            .map_err(error::microsandbox)?;
        let key = (sandbox_id.clone(), execution_id.clone());
        self.executions.borrow_mut().insert(key.clone(), handle.control());
        let guard = ExecutionGuard {
            controls: Rc::clone(&self.executions),
            key,
            completed: false,
        };
        let events = stream::unfold((handle, guard), |(mut handle, mut guard)| async move {
            handle.recv().await.map(|event| {
                let event = map_event(event);
                if matches!(
                    &event,
                    Ok(execution::ExecutionEvent::Exited(_) | execution::ExecutionEvent::Failed { .. })
                ) {
                    guard.complete();
                }
                (event, (handle, guard))
            })
        });

        Ok(execution::StartedExecution {
            id: execution_id,
            events: Box::pin(events),
        })
    }

    pub(crate) async fn start_terminal_execution_stream(
        &self,
        sandbox_id: &SandboxId,
        request: terminal::StartTerminalExecutionRequest,
    ) -> Result<terminal::StartedTerminalExecution, Error> {
        let (execution_id, spec, initial_size) = request.into_parts();
        let sandbox = self.state.sandbox_by_id(sandbox_id).await?;
        let runtime = self.connect_running(&sandbox).await?;
        let mut handle = start_runtime_terminal_execution(&runtime, &spec, initial_size)
            .await
            .map_err(error::microsandbox)?;
        let input = handle
            .take_stdin()
            .ok_or_else(|| Error::Backend("Microsandbox terminal Execution did not provide stdin".to_string()))?;
        let runtime_control = handle.control();
        let key = (sandbox_id.clone(), execution_id.clone());
        self.executions
            .borrow_mut()
            .insert(key.clone(), runtime_control.clone());
        let guard = ExecutionGuard {
            controls: Rc::clone(&self.executions),
            key,
            completed: false,
        };
        let events = stream::unfold((handle, guard), |(mut handle, mut guard)| async move {
            handle.recv().await.map(|event| {
                let event = map_terminal_event(event);
                if matches!(
                    &event,
                    Ok(terminal::TerminalEvent::Exited(_) | terminal::TerminalEvent::Failed { .. })
                ) {
                    guard.complete();
                }
                (event, (handle, guard))
            })
        });

        Ok(terminal::StartedTerminalExecution {
            id: execution_id,
            control: Rc::new(MicrosandboxTerminalControl { input, runtime_control }),
            events: Box::pin(events),
        })
    }

    pub(crate) async fn attach_terminal_to_runtime(
        &self,
        sandbox_id: &SandboxId,
        request: terminal::AttachTerminalRequest,
    ) -> Result<terminal::TerminalAttachOutcome, Error> {
        let sandbox = self.state.sandbox_by_id(sandbox_id).await?;
        let runtime = self.connect_running(&sandbox).await?;
        let spec = request.into_spec();
        let exit_code = match spec.program() {
            execution::Program::ImageEntrypoint => {
                runtime
                    .attach_default_with(|options| apply_attach_options(options, &spec))
                    .await
            }
            execution::Program::Command { executable, args } => {
                runtime
                    .attach_with(executable.as_str(), |options| {
                        apply_attach_options(options.args(args.iter().cloned()), &spec)
                    })
                    .await
            }
        }
        .map_err(error::microsandbox)?;

        Ok(if exit_code == DETACHED_EXIT_CODE {
            terminal::TerminalAttachOutcome::Detached
        } else {
            terminal::TerminalAttachOutcome::Exited(execution::ExitStatus { code: exit_code })
        })
    }

    pub(crate) async fn control_execution(
        &self,
        sandbox_id: &SandboxId,
        execution_id: &execution::ExecutionId,
        force: bool,
    ) -> Result<(), Error> {
        let key = (sandbox_id.clone(), execution_id.clone());
        let control = self
            .executions
            .borrow()
            .get(&key)
            .cloned()
            .ok_or_else(|| Error::not_found(ResourceKind::Execution, execution_id))?;
        if force {
            control.kill().await
        } else {
            control.signal(15).await
        }
        .map_err(error::microsandbox)
    }
}

fn apply_attach_options(mut options: AttachOptionsBuilder, spec: &execution::ExecutionSpec) -> AttachOptionsBuilder {
    if let Some(working_directory) = spec.working_directory() {
        options = options.cwd(working_directory.as_str());
    }
    options.envs(
        spec.environment()
            .iter()
            .map(|(key, value)| (key.clone(), value.clone())),
    )
}

async fn start_runtime_execution(
    runtime: &microsandbox::Sandbox,
    spec: &execution::ExecutionSpec,
) -> microsandbox::MicrosandboxResult<microsandbox::ExecHandle> {
    let working_directory = spec.working_directory().map(|path| path.as_str().to_string());
    let environment = spec.environment().clone();
    match spec.program() {
        execution::Program::ImageEntrypoint => {
            runtime
                .exec_default_stream_with(move |options| configure(options, working_directory, environment))
                .await
        }
        execution::Program::Command { executable, args } => {
            let args = args.clone();
            runtime
                .exec_stream_with(executable.as_str(), move |options| {
                    configure(options.args(args), working_directory, environment)
                })
                .await
        }
    }
}

async fn start_runtime_terminal_execution(
    runtime: &microsandbox::Sandbox,
    spec: &execution::ExecutionSpec,
    size: terminal::TerminalSize,
) -> microsandbox::MicrosandboxResult<microsandbox::ExecHandle> {
    let working_directory = spec.working_directory().map(|path| path.as_str().to_string());
    let environment = spec.environment().clone();
    match spec.program() {
        execution::Program::ImageEntrypoint => {
            runtime
                .exec_default_stream_with(move |options| {
                    configure(
                        options
                            .stdin_pipe()
                            .tty(true)
                            .terminal_size(size.rows(), size.columns()),
                        working_directory,
                        environment,
                    )
                })
                .await
        }
        execution::Program::Command { executable, args } => {
            let args = args.clone();
            runtime
                .exec_stream_with(executable.as_str(), move |options| {
                    configure(
                        options
                            .args(args)
                            .stdin_pipe()
                            .tty(true)
                            .terminal_size(size.rows(), size.columns()),
                        working_directory,
                        environment,
                    )
                })
                .await
        }
    }
}

fn configure(
    mut options: ExecOptionsBuilder,
    working_directory: Option<String>,
    environment: std::collections::BTreeMap<String, String>,
) -> ExecOptionsBuilder {
    if let Some(directory) = working_directory {
        options = options.cwd(directory);
    }
    options.envs(environment)
}

fn map_event(event: ExecEvent) -> Result<execution::ExecutionEvent, Error> {
    Ok(match event {
        ExecEvent::Started { pid } => execution::ExecutionEvent::Started { process_id: Some(pid) },
        ExecEvent::Stdout(bytes) => execution::ExecutionEvent::Stdout(bytes),
        ExecEvent::Stderr(bytes) => execution::ExecutionEvent::Stderr(bytes),
        ExecEvent::Exited { code } => execution::ExecutionEvent::Exited(execution::ExitStatus { code }),
        ExecEvent::Failed(failure) => execution::ExecutionEvent::Failed {
            message: failure.message,
        },
        ExecEvent::StdinError(failure) => {
            return Err(Error::Backend(format!(
                "Microsandbox Execution stdin failed: {failure:?}"
            )));
        }
    })
}

fn map_terminal_event(event: ExecEvent) -> Result<terminal::TerminalEvent, Error> {
    Ok(match event {
        ExecEvent::Started { pid } => terminal::TerminalEvent::Started { process_id: Some(pid) },
        ExecEvent::Stdout(bytes) | ExecEvent::Stderr(bytes) => terminal::TerminalEvent::Output(bytes),
        ExecEvent::Exited { code } => terminal::TerminalEvent::Exited(execution::ExitStatus { code }),
        ExecEvent::Failed(failure) => terminal::TerminalEvent::Failed {
            message: failure.message,
        },
        ExecEvent::StdinError(failure) => {
            return Err(Error::Backend(format!(
                "Microsandbox terminal Execution stdin failed: {failure:?}"
            )));
        }
    })
}

struct MicrosandboxTerminalControl {
    input: microsandbox::sandbox::exec::ExecSink,
    runtime_control: ExecControl,
}

impl terminal::TerminalControl for MicrosandboxTerminalControl {
    fn write_input(&self, bytes: bytes::Bytes) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            if bytes.is_empty() {
                return Ok(());
            }
            self.input.write(bytes).await.map_err(error::microsandbox)
        })
    }

    fn close_input(&self) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move { self.input.close().await.map_err(error::microsandbox) })
    }

    fn resize(&self, size: terminal::TerminalSize) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.runtime_control
                .resize(size.rows(), size.columns())
                .await
                .map_err(error::microsandbox)
        })
    }
}

struct ExecutionGuard {
    controls: ExecutionControls,
    key: ExecutionKey,
    completed: bool,
}

impl ExecutionGuard {
    fn complete(&mut self) {
        self.controls.borrow_mut().remove(&self.key);
        self.completed = true;
    }
}

impl Drop for ExecutionGuard {
    fn drop(&mut self) {
        let control = self.controls.borrow_mut().remove(&self.key);
        if self.completed {
            return;
        }
        if let Some(control) = control
            && let Ok(handle) = tokio::runtime::Handle::try_current()
        {
            handle.spawn(async move {
                let _ignored = control.kill().await;
            });
        }
    }
}
