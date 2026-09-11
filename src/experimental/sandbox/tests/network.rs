#![allow(clippy::expect_used)]

use std::{
    future::poll_fn,
    net::{IpAddr, Ipv4Addr, Ipv6Addr},
    num::{NonZeroU32, NonZeroUsize},
};

use bytes::Bytes;
use sandbox::{
    memory,
    network::{
        InterfaceAddress, MacAddress, NetworkControlMessage, NetworkEndpoint, NetworkEndpointError,
        NetworkInterfaceConfiguration, NetworkPacket, NetworkPacketBatch, NetworkTransferProgress, PacketEndpoint,
        PacketEndpointProperties, PacketMedium,
    },
};

const fn nonzero(value: usize) -> NonZeroUsize {
    NonZeroUsize::new(value).expect("test value should be nonzero")
}

fn properties() -> PacketEndpointProperties {
    PacketEndpointProperties::new(
        PacketMedium::Ethernet,
        interface_configuration(),
        NonZeroU32::new(1_514).expect("test frame length should be nonzero"),
    )
}

fn interface_configuration() -> NetworkInterfaceConfiguration {
    NetworkInterfaceConfiguration::new(
        MacAddress::new([0x02, 0, 0, 0, 0, 2]),
        NonZeroU32::new(1_500).expect("test MTU should be nonzero"),
        vec![
            InterfaceAddress::new(IpAddr::V4(Ipv4Addr::new(192, 0, 2, 2)), 24).expect("valid test IPv4 prefix"),
            InterfaceAddress::new(IpAddr::V6(Ipv6Addr::LOCALHOST), 128).expect("valid test IPv6 prefix"),
        ],
        vec![IpAddr::V4(Ipv4Addr::new(192, 0, 2, 1))],
        vec![IpAddr::V4(Ipv4Addr::new(192, 0, 2, 53))],
    )
}

fn packet(payload: &'static [u8]) -> NetworkPacket {
    let mut bytes = vec![0; 14];
    bytes.extend_from_slice(payload);
    NetworkPacket::new(Bytes::from(bytes))
}

#[tokio::test(flavor = "local")]
async fn packet_endpoint_moves_bounded_batches_in_both_directions() {
    let (endpoint, mut peer) = memory::packet_endpoint_pair(nonzero(4), properties());
    assert_eq!(endpoint.properties(), &properties());
    let mut parts = endpoint.into_parts();

    peer.emit_from_sandbox(packet(b"sandbox-one"))
        .await
        .expect("emit first Sandbox packet");
    peer.emit_from_sandbox(packet(b"sandbox-two"))
        .await
        .expect("emit second Sandbox packet");
    peer.emit_from_sandbox(packet(b"sandbox-three"))
        .await
        .expect("emit third Sandbox packet");

    let mut received = NetworkPacketBatch::new(nonzero(2));
    let progress = poll_fn(|context| parts.from_sandbox.as_mut().poll_receive(context, &mut received))
        .await
        .expect("receive Sandbox packets");
    assert_eq!(progress, NetworkTransferProgress::Items(nonzero(2)));
    assert_eq!(received.pop_front(), Some(packet(b"sandbox-one")));
    assert_eq!(received.pop_front(), Some(packet(b"sandbox-two")));
    let progress = poll_fn(|context| parts.from_sandbox.as_mut().poll_receive(context, &mut received))
        .await
        .expect("receive remaining Sandbox packet");
    assert_eq!(progress, NetworkTransferProgress::Items(nonzero(1)));
    assert_eq!(received.pop_front(), Some(packet(b"sandbox-three")));

    let mut pending = NetworkPacketBatch::new(nonzero(4));
    pending.push_back(packet(b"network-one")).expect("queue first packet");
    pending.push_back(packet(b"network-two")).expect("queue second packet");
    let progress = poll_fn(|context| parts.to_sandbox.as_mut().poll_send(context, &mut pending))
        .await
        .expect("send packets to Sandbox");
    assert_eq!(progress, NetworkTransferProgress::Items(nonzero(2)));
    assert!(pending.is_empty());
    poll_fn(|context| parts.to_sandbox.as_mut().poll_flush(context))
        .await
        .expect("flush packets to Sandbox");
    assert_eq!(peer.receive_for_sandbox().await, Some(packet(b"network-one")));
    assert_eq!(peer.receive_for_sandbox().await, Some(packet(b"network-two")));
}

#[tokio::test(flavor = "local")]
async fn receive_wakes_when_the_sandbox_emits_a_packet() {
    let (endpoint, peer) = memory::packet_endpoint_pair(nonzero(1), properties());
    let mut receiver = endpoint.into_parts().from_sandbox;
    let mut batch = NetworkPacketBatch::new(nonzero(1));

    let receive = poll_fn(|context| receiver.as_mut().poll_receive(context, &mut batch));
    let emit = peer.emit_from_sandbox(packet(b"wake"));
    let (progress, emitted) = tokio::join!(receive, emit);

    emitted.expect("emit packet after receiver registered its waker");
    assert_eq!(
        progress.expect("receiver should wake after a packet arrives"),
        NetworkTransferProgress::Items(nonzero(1))
    );
    assert_eq!(batch.pop_front(), Some(packet(b"wake")));
}

#[tokio::test(flavor = "local")]
async fn send_reports_partial_progress_and_wakes_after_backpressure() {
    let (endpoint, mut peer) = memory::packet_endpoint_pair(nonzero(1), properties());
    let mut sender = endpoint.into_parts().to_sandbox;
    let mut pending = NetworkPacketBatch::new(nonzero(2));
    pending.push_back(packet(b"first")).expect("queue first packet");
    pending.push_back(packet(b"second")).expect("queue second packet");

    let first_progress = poll_fn(|context| sender.as_mut().poll_send(context, &mut pending))
        .await
        .expect("send until bounded channel becomes full");
    assert_eq!(first_progress, NetworkTransferProgress::Items(nonzero(1)));
    assert_eq!(pending.len(), 1);

    let send_after_capacity = poll_fn(|context| sender.as_mut().poll_send(context, &mut pending));
    let receive_first = peer.receive_for_sandbox();
    let (second_progress, first) = tokio::join!(send_after_capacity, receive_first);

    assert_eq!(first, Some(packet(b"first")));
    assert_eq!(
        second_progress.expect("sender should wake after capacity becomes available"),
        NetworkTransferProgress::Items(nonzero(1))
    );
    assert!(pending.is_empty());
    assert_eq!(peer.receive_for_sandbox().await, Some(packet(b"second")));
}

#[tokio::test(flavor = "local")]
async fn receive_drains_queued_packets_before_reporting_closure() {
    let (endpoint, mut peer) = memory::packet_endpoint_pair(nonzero(2), properties());
    peer.emit_from_sandbox(packet(b"last"))
        .await
        .expect("emit final packet");
    peer.close_from_sandbox();
    let mut receiver = endpoint.into_parts().from_sandbox;
    let mut batch = NetworkPacketBatch::new(nonzero(2));

    let progress = poll_fn(|context| receiver.as_mut().poll_receive(context, &mut batch))
        .await
        .expect("drain final packet");
    assert_eq!(progress, NetworkTransferProgress::Items(nonzero(1)));
    assert_eq!(batch.pop_front(), Some(packet(b"last")));

    let progress = poll_fn(|context| receiver.as_mut().poll_receive(context, &mut batch))
        .await
        .expect("observe closure after draining");
    assert_eq!(progress, NetworkTransferProgress::Closed);
}

#[tokio::test(flavor = "local")]
async fn closed_destination_retains_unaccepted_packets() {
    let (endpoint, mut peer) = memory::packet_endpoint_pair(nonzero(1), properties());
    peer.close_to_sandbox();
    let mut sender = endpoint.into_parts().to_sandbox;
    let mut pending = NetworkPacketBatch::new(nonzero(1));
    pending.push_back(packet(b"retained")).expect("queue packet");

    let progress = poll_fn(|context| sender.as_mut().poll_send(context, &mut pending))
        .await
        .expect("closed destination is a normal endpoint state");

    assert_eq!(progress, NetworkTransferProgress::Closed);
    assert_eq!(pending.pop_front(), Some(packet(b"retained")));
}

#[tokio::test(flavor = "local")]
async fn endpoint_enforces_its_maximum_packet_length() {
    let short_properties = PacketEndpointProperties::new(
        PacketMedium::Ethernet,
        interface_configuration(),
        NonZeroU32::new(14).expect("test frame length should be nonzero"),
    );
    let (endpoint, peer) = memory::packet_endpoint_pair(nonzero(1), short_properties);
    let oversized = packet(b"x");

    let error = peer
        .emit_from_sandbox(oversized.clone())
        .await
        .expect_err("Sandbox packet should respect the endpoint maximum");
    assert!(matches!(
        error,
        NetworkEndpointError::PacketTooLarge {
            actual: 15,
            maximum: 14
        }
    ));

    let mut sender = endpoint.into_parts().to_sandbox;
    let mut pending = NetworkPacketBatch::new(nonzero(1));
    pending.push_back(oversized.clone()).expect("queue oversized packet");
    let error = poll_fn(|context| sender.as_mut().poll_send(context, &mut pending))
        .await
        .expect_err("Network Backend packet should respect the endpoint maximum");
    assert!(matches!(error, NetworkEndpointError::PacketTooLarge { .. }));
    assert_eq!(pending.pop_front(), Some(oversized));
}

#[tokio::test(flavor = "local")]
async fn sender_shutdown_is_idempotent_and_prevents_new_packets() {
    let (endpoint, _peer) = memory::packet_endpoint_pair(nonzero(1), properties());
    let mut sender = endpoint.into_parts().to_sandbox;

    poll_fn(|context| sender.as_mut().poll_shutdown(context))
        .await
        .expect("first shutdown");
    poll_fn(|context| sender.as_mut().poll_shutdown(context))
        .await
        .expect("idempotent shutdown");

    let mut pending = NetworkPacketBatch::new(nonzero(1));
    let unsent = packet(b"after-shutdown");
    pending.push_back(unsent.clone()).expect("queue packet after shutdown");
    let progress = poll_fn(|context| sender.as_mut().poll_send(context, &mut pending))
        .await
        .expect("closed sender should report its state");
    assert_eq!(progress, NetworkTransferProgress::Closed);
    assert_eq!(pending.pop_front(), Some(unsent));
}

#[test]
fn live_endpoint_can_move_to_a_dedicated_thread() {
    fn assert_send<T: Send>() {}

    assert_send::<PacketEndpoint>();
    assert_send::<NetworkEndpoint>();
}

#[test]
fn packet_properties_expose_complete_immutable_interface_configuration() {
    let properties = properties();
    let interface = properties.interface();

    assert_eq!(properties.medium(), PacketMedium::Ethernet);
    assert_eq!(properties.maximum_frame_length().get(), 1_514);
    assert_eq!(interface.mac_address().to_string(), "02:00:00:00:00:02");
    assert_eq!(interface.mtu().get(), 1_500);
    assert_eq!(interface.addresses().len(), 2);
    assert_eq!(interface.default_gateways(), [IpAddr::V4(Ipv4Addr::new(192, 0, 2, 1))]);
    assert_eq!(interface.dns_servers(), [IpAddr::V4(Ipv4Addr::new(192, 0, 2, 53))]);
}

#[test]
fn interface_address_deserialization_rejects_invalid_prefixes() {
    let error = serde_json::from_str::<InterfaceAddress>(r#"{"address":"192.0.2.2","prefixLength":33}"#)
        .expect_err("IPv4 prefix above 32 should be rejected");

    assert!(error.to_string().contains("prefix length 33 is invalid"));
}

#[test]
fn opaque_control_message_debug_output_does_not_expose_payload() {
    let message = NetworkControlMessage::new(b"must-not-appear");

    let debug = format!("{message:?}");

    assert!(!debug.contains("must-not-appear"));
    assert!(debug.contains("15"));
}
