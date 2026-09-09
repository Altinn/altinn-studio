use std::{
    num::NonZeroUsize,
    pin::Pin,
    task::{Context, Poll},
};

use microsandbox_network::control::{NetworkControlHost, NetworkControlIncoming};
use sandbox::network::{
    BatchReceiver, BatchSender, NetworkBatch, NetworkControlEndpoint, NetworkControlEndpointProperties,
    NetworkControlMessage, NetworkControlProtocolId, NetworkEndpointError, NetworkTransferProgress,
};
use tokio_util::sync::PollSender;

pub(crate) fn open(controller: NetworkControlHost) -> Result<NetworkControlEndpoint, sandbox::Error> {
    let maximum_message_length = NonZeroUsize::new(microsandbox_network::control::MAX_CONTROL_MESSAGE_LENGTH)
        .ok_or_else(|| sandbox::Error::Backend("invalid Network control message length".into()))?;
    let parts = controller.into_parts();

    Ok(NetworkControlEndpoint::new(
        NetworkControlEndpointProperties::new(
            NetworkControlProtocolId::new(microsandbox_network::control::NETWORK_CONTROL_PROTOCOL),
            maximum_message_length,
        ),
        ControlReceiver {
            receiver: parts.incoming,
        },
        ControlSender {
            sender: PollSender::new(parts.outgoing),
            maximum_message_length: maximum_message_length.get(),
        },
    ))
}

struct ControlReceiver {
    receiver: NetworkControlIncoming,
}

impl BatchReceiver<NetworkControlMessage> for ControlReceiver {
    fn poll_receive(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
        output: &mut NetworkBatch<NetworkControlMessage>,
    ) -> Poll<Result<NetworkTransferProgress, NetworkEndpointError>> {
        if output.is_full() {
            return Poll::Ready(Err(NetworkEndpointError::FullReceiveBatch));
        }

        let mut received = 0;
        while !output.is_full() {
            match self.receiver.poll_recv(context) {
                Poll::Ready(Some(message)) => {
                    if output.push_back(NetworkControlMessage::from(message)).is_err() {
                        return Poll::Ready(Err(NetworkEndpointError::FullReceiveBatch));
                    }
                    received += 1;
                }
                Poll::Ready(None) => return transfer_or_closed(received),
                Poll::Pending => return transfer_or_pending(received),
            }
        }
        transfer_or_full(received)
    }
}

struct ControlSender {
    sender: PollSender<zeroize::Zeroizing<Vec<u8>>>,
    maximum_message_length: usize,
}

impl BatchSender<NetworkControlMessage> for ControlSender {
    fn poll_send(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
        pending: &mut NetworkBatch<NetworkControlMessage>,
    ) -> Poll<Result<NetworkTransferProgress, NetworkEndpointError>> {
        if pending.is_empty() {
            return Poll::Ready(Err(NetworkEndpointError::EmptySendBatch));
        }

        let mut sent = 0;
        while let Some(message) = pending.front() {
            if message.len() > self.maximum_message_length {
                return transfer_or_error(
                    sent,
                    NetworkEndpointError::ControlMessageTooLarge {
                        actual: message.len(),
                        maximum: self.maximum_message_length,
                    },
                );
            }
            match self.sender.poll_reserve(context) {
                Poll::Ready(Ok(())) => {
                    let Some(message) = pending.pop_front() else {
                        return Poll::Ready(Err(NetworkEndpointError::EmptySendBatch));
                    };
                    if let Err(rejected) = self.sender.send_item(message.into_bytes()) {
                        if let Some(message) = rejected.into_inner()
                            && pending.push_front(NetworkControlMessage::from(message)).is_err()
                        {
                            return Poll::Ready(Err(NetworkEndpointError::Backend(
                                "failed to restore an unaccepted Network control message".into(),
                            )));
                        }
                        return transfer_or_closed(sent);
                    }
                    sent += 1;
                }
                Poll::Ready(Err(_)) => return transfer_or_closed(sent),
                Poll::Pending => return transfer_or_pending(sent),
            }
        }
        transfer_or_error(sent, NetworkEndpointError::EmptySendBatch)
    }

    fn poll_flush(self: Pin<&mut Self>, _context: &mut Context<'_>) -> Poll<Result<(), NetworkEndpointError>> {
        Poll::Ready(Ok(()))
    }

    fn poll_shutdown(mut self: Pin<&mut Self>, _context: &mut Context<'_>) -> Poll<Result<(), NetworkEndpointError>> {
        self.sender.abort_send();
        self.sender.close();
        Poll::Ready(Ok(()))
    }
}

fn transfer_or_closed(count: usize) -> Poll<Result<NetworkTransferProgress, NetworkEndpointError>> {
    NonZeroUsize::new(count).map_or(Poll::Ready(Ok(NetworkTransferProgress::Closed)), |count| {
        Poll::Ready(Ok(NetworkTransferProgress::Items(count)))
    })
}

fn transfer_or_pending(count: usize) -> Poll<Result<NetworkTransferProgress, NetworkEndpointError>> {
    NonZeroUsize::new(count).map_or(Poll::Pending, |count| {
        Poll::Ready(Ok(NetworkTransferProgress::Items(count)))
    })
}

fn transfer_or_full(count: usize) -> Poll<Result<NetworkTransferProgress, NetworkEndpointError>> {
    NonZeroUsize::new(count).map_or(Poll::Ready(Err(NetworkEndpointError::FullReceiveBatch)), |count| {
        Poll::Ready(Ok(NetworkTransferProgress::Items(count)))
    })
}

fn transfer_or_error(
    count: usize,
    error: NetworkEndpointError,
) -> Poll<Result<NetworkTransferProgress, NetworkEndpointError>> {
    NonZeroUsize::new(count).map_or(Poll::Ready(Err(error)), |count| {
        Poll::Ready(Ok(NetworkTransferProgress::Items(count)))
    })
}
