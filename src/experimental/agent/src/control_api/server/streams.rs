//! Startup acknowledgments and daemon-owned streaming operation lifetimes.

use std::{rc::Rc, time::Duration};

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use futures_util::StreamExt as _;
use serde::Serialize;
use tokio::io::{AsyncRead, AsyncWrite, BufReader};

use crate::{
    Error,
    control_api::protocol::{
        ExecutionServerMessage, ExecutionStreamResult, MessageReader, PortForwardBinding, PortForwardServerMessage,
        PortForwardStartResult, ReadMessage, TerminalClientMessage, TerminalServerMessage, write_stream_message,
    },
};

use super::result_response;

/// Replies before handing a connection to an operation's event loop. Keeping the
/// operation here also releases it if the startup response cannot be delivered.
async fn acknowledge_start<W: AsyncWrite + Unpin, T, R: Serialize>(
    writer: &mut W,
    id: u64,
    started: Result<T, Error>,
    metadata: impl FnOnce(&T) -> R,
) -> Result<Option<T>, Error> {
    let (result, operation) = match started {
        Ok(operation) => (Ok(metadata(&operation)), Some(operation)),
        Err(error) => (Err(error), None),
    };
    write_stream_message(writer, &result_response(id, result)).await?;
    Ok(operation)
}

pub(super) async fn serve_port_forwards<S>(
    mut stream: BufReader<S>,
    id: u64,
    started: Result<Vec<Rc<dyn crate::sandbox::RunningPortForward>>, Error>,
) -> Result<(), Error>
where
    S: AsyncRead + AsyncWrite + Unpin,
{
    let Some(forwards) = acknowledge_start(stream.get_mut(), id, started, |forwards| PortForwardStartResult {
        bindings: forwards
            .iter()
            .map(|forward| PortForwardBinding {
                local_address: forward.local_address(),
                guest_port: forward.spec().guest_port(),
            })
            .collect(),
    })
    .await?
    else {
        return Ok(());
    };
    let (reader, mut writer) = tokio::io::split(stream);
    let mut reader = MessageReader::new(BufReader::new(reader));
    let mut reported = forwards.iter().map(|forward| forward.status()).collect::<Vec<_>>();
    let mut stopped = vec![false; forwards.len()];
    let mut poll = tokio::time::interval(Duration::from_secs(1));
    poll.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    loop {
        tokio::select! {
            message = reader.next() => match message? {
                ReadMessage::EndOfStream => return Ok(()),
                ReadMessage::TooLarge | ReadMessage::Complete(_) => {
                    return Err(Error::Invalid("port-forward stream does not accept client messages".into()));
                }
            },
            _ = poll.tick() => {
                for (index, forward) in forwards.iter().enumerate() {
                    let wire_index = u32::try_from(index)
                        .map_err(|_| Error::Invalid("too many port forwards".into()))?;
                    let status = forward.status();
                    if status != reported[index] {
                        write_stream_message(
                            &mut writer,
                            &PortForwardServerMessage::Status { index: wire_index, message: status.clone() },
                        ).await?;
                        reported[index] = status;
                    }
                    if forward.finished() && !stopped[index] {
                        write_stream_message(
                            &mut writer,
                            &PortForwardServerMessage::Stopped { index: wire_index, message: forward.status() },
                        ).await?;
                        stopped[index] = true;
                    }
                }
                if stopped.iter().all(|stopped| *stopped) {
                    return Ok(());
                }
            }
        }
    }
}

pub(super) async fn serve_execution<S>(
    mut stream: BufReader<S>,
    id: u64,
    started: Result<sandbox::execution::StartedExecution, Error>,
) -> Result<(), Error>
where
    S: AsyncRead + AsyncWrite + Unpin,
{
    let Some(execution) = acknowledge_start(stream.get_mut(), id, started, |execution| ExecutionStreamResult {
        execution_id: execution.id.clone(),
    })
    .await?
    else {
        return Ok(());
    };
    let (reader, mut writer) = tokio::io::split(stream);
    let mut reader = MessageReader::new(BufReader::new(reader));
    let mut events = execution.events;
    loop {
        tokio::select! {
            message = reader.next() => match message? {
                ReadMessage::EndOfStream => return Ok(()),
                ReadMessage::TooLarge | ReadMessage::Complete(_) => {
                    return Err(Error::Invalid("non-interactive Execution stream does not accept client messages".into()));
                }
            },
            event = events.next() => match event {
                Some(Ok(sandbox::execution::ExecutionEvent::Started { .. })) => {}
                Some(Ok(sandbox::execution::ExecutionEvent::Stdout(data))) => {
                    write_stream_message(&mut writer, &ExecutionServerMessage::Stdout { data: BASE64.encode(data) }).await?;
                }
                Some(Ok(sandbox::execution::ExecutionEvent::Stderr(data))) => {
                    write_stream_message(&mut writer, &ExecutionServerMessage::Stderr { data: BASE64.encode(data) }).await?;
                }
                Some(Ok(sandbox::execution::ExecutionEvent::Exited(status))) => {
                    write_stream_message(&mut writer, &ExecutionServerMessage::Exited { code: status.code }).await?;
                    return Ok(());
                }
                Some(Ok(sandbox::execution::ExecutionEvent::Failed { message })) => {
                    write_stream_message(&mut writer, &ExecutionServerMessage::Failed { message }).await?;
                    return Ok(());
                }
                Some(Err(error)) => return Err(error.into()),
                None => {
                    write_stream_message(
                        &mut writer,
                        &ExecutionServerMessage::Failed { message: "Execution stream ended without an outcome".into() },
                    ).await?;
                    return Ok(());
                }
                Some(Ok(_)) => return Err(Error::Session("Execution stream returned an unsupported event".into())),
            }
        }
    }
}

pub(super) async fn serve_terminal<S>(
    mut stream: BufReader<S>,
    id: u64,
    started: Result<sandbox::terminal::StartedTerminalExecution, Error>,
) -> Result<(), Error>
where
    S: AsyncRead + AsyncWrite + Unpin,
{
    let Some(terminal) = acknowledge_start(stream.get_mut(), id, started, |terminal| ExecutionStreamResult {
        execution_id: terminal.id.clone(),
    })
    .await?
    else {
        return Ok(());
    };
    let (reader, mut writer) = tokio::io::split(stream);
    let mut reader = MessageReader::new(BufReader::new(reader));
    let control = terminal.control;
    let mut events = terminal.events;
    loop {
        tokio::select! {
            message = reader.next() => match message? {
                ReadMessage::EndOfStream => return Ok(()),
                ReadMessage::TooLarge => return Err(Error::Invalid("terminal input message exceeds 4 MiB".into())),
                ReadMessage::Complete(message) => {
                    let message = serde_json::from_slice::<TerminalClientMessage>(&message)?;
                    match message {
                        TerminalClientMessage::Input { data } => {
                            let data = BASE64.decode(data).map_err(|error| {
                                Error::Invalid(format!("terminal input is not valid base64: {error}"))
                            })?;
                            control.write_input(data.into()).await?;
                        }
                        TerminalClientMessage::CloseInput => control.close_input().await?,
                        TerminalClientMessage::Resize { rows, columns } => {
                            let size = sandbox::terminal::TerminalSize::new(rows, columns)
                                .map_err(|error| Error::Invalid(error.to_string()))?;
                            control.resize(size).await?;
                        }
                    }
                }
            },
            event = events.next() => match event {
                Some(Ok(sandbox::terminal::TerminalEvent::Started { .. })) => {}
                Some(Ok(sandbox::terminal::TerminalEvent::Output(data))) => {
                    write_stream_message(&mut writer, &TerminalServerMessage::Output { data: BASE64.encode(data) }).await?;
                }
                Some(Ok(sandbox::terminal::TerminalEvent::Exited(status))) => {
                    write_stream_message(&mut writer, &TerminalServerMessage::Exited { code: status.code }).await?;
                    return Ok(());
                }
                Some(Ok(sandbox::terminal::TerminalEvent::Failed { message })) => {
                    write_stream_message(&mut writer, &TerminalServerMessage::Failed { message }).await?;
                    return Ok(());
                }
                Some(Err(error)) => return Err(error.into()),
                None => {
                    write_stream_message(
                        &mut writer,
                        &TerminalServerMessage::Failed { message: "terminal stream ended without an outcome".into() },
                    ).await?;
                    return Ok(());
                }
                Some(Ok(_)) => return Err(Error::Session("terminal stream returned an unsupported event".into())),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::*;

    #[tokio::test(flavor = "local")]
    async fn failed_startup_response_releases_the_operation() {
        struct DropFlag(Rc<std::cell::Cell<bool>>);
        impl Drop for DropFlag {
            fn drop(&mut self) {
                self.0.set(true);
            }
        }

        let dropped = Rc::new(std::cell::Cell::new(false));
        let (client, mut server) = tokio::io::duplex(64);
        drop(client);
        let result = acknowledge_start(&mut server, 1, Ok(DropFlag(dropped.clone())), |_| serde_json::json!({})).await;

        assert!(matches!(result, Err(Error::Io(_))));
        assert!(dropped.get(), "a failed handshake must not retain the operation");
    }
}
