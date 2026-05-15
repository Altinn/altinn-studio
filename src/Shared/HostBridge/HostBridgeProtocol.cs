#nullable enable

using System.Buffers;
using System.Buffers.Binary;
using System.Net.WebSockets;
using System.Text.Json;

namespace Altinn.Studio.HostBridge;

public enum HostBridgeFrameKind : byte
{
    RequestStart = 1,
    RequestBody = 2,
    ResponseStart = 3,
    ResponseBody = 4,
    ResponseTrailers = 5,
    Cancel = 6,
    Error = 7,
}

public sealed record RequestStartFrame(
    long RequestId,
    string Method,
    string PathAndQuery,
    Dictionary<string, string[]> Headers,
    bool HasBody,
    string Target,
    int TargetPort
);

public sealed record ResponseStartFrame(
    long RequestId,
    int StatusCode,
    Dictionary<string, string[]> Headers
);

public sealed record HeadersFrame(long RequestId, Dictionary<string, string[]> Headers);

public sealed record ErrorFrame(long RequestId, string Message);

public readonly record struct BodyFrame(long RequestId, bool IsFinal, byte[] Payload);

public static class HostBridgeDefaults
{
    public const string EndpointPath = "/internal/host-bridge";
    public const int FrontendDevServerPort = 8080;

    // 64 KiB keeps websocket messages reasonably sized while still amortizing framing overhead.
    public const int MaxFramePayloadBytes = 64 * 1024;
    public const int BodyChannelCapacity = 8;
}

public static class HostBridgeProtocol
{
    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    public static HostBridgeFrameKind ReadKind(ReadOnlySpan<byte> message)
    {
        if (message.Length < 1)
        {
            throw new InvalidDataException("empty host bridge frame");
        }

        return (HostBridgeFrameKind)message[0];
    }

    public static byte[] WriteJsonFrame<T>(HostBridgeFrameKind kind, T payload)
    {
        var json = JsonSerializer.SerializeToUtf8Bytes(payload, _jsonOptions);
        var frame = new byte[json.Length + 1];
        frame[0] = (byte)kind;
        json.CopyTo(frame.AsSpan(1));
        return frame;
    }

    public static T ReadJsonFrame<T>(HostBridgeFrameKind expectedKind, ReadOnlySpan<byte> message)
    {
        var kind = ReadKind(message);
        if (kind != expectedKind)
        {
            throw new InvalidDataException($"unexpected host bridge frame kind {kind}, expected {expectedKind}");
        }

        return JsonSerializer.Deserialize<T>(message[1..], _jsonOptions)
            ?? throw new InvalidDataException("invalid host bridge json frame");
    }

    public static byte[] WriteBodyFrame(
        HostBridgeFrameKind kind,
        long requestId,
        bool isFinal,
        ReadOnlySpan<byte> payload
    )
    {
        var frame = new byte[payload.Length + 10];
        frame[0] = (byte)kind;
        BinaryPrimitives.WriteInt64LittleEndian(frame.AsSpan(1, 8), requestId);
        frame[9] = isFinal ? (byte)1 : (byte)0;
        payload.CopyTo(frame.AsSpan(10));
        return frame;
    }

    public static BodyFrame ReadBodyFrame(HostBridgeFrameKind expectedKind, ReadOnlySpan<byte> message)
    {
        var kind = ReadKind(message);
        if (kind != expectedKind)
        {
            throw new InvalidDataException($"unexpected host bridge frame kind {kind}, expected {expectedKind}");
        }

        if (message.Length < 10)
        {
            throw new InvalidDataException("invalid host bridge body frame");
        }

        var requestId = BinaryPrimitives.ReadInt64LittleEndian(message.Slice(1, 8));
        var isFinal = message[9] != 0;
        return new BodyFrame(requestId, isFinal, message[10..].ToArray());
    }

    public static async Task<bool> ReadMessage(
        WebSocket socket,
        Memory<byte> receiveBuffer,
        ArrayBufferWriter<byte> messageBuffer,
        CancellationToken cancellationToken
    )
    {
        messageBuffer.Clear();

        while (true)
        {
            var result = await socket.ReceiveAsync(receiveBuffer, cancellationToken);
            if (result.MessageType == WebSocketMessageType.Close)
                return false;

            if (result.MessageType != WebSocketMessageType.Binary)
                throw new InvalidDataException("host bridge only supports binary websocket messages");

            if (result.Count > 0)
            {
                receiveBuffer[..result.Count].CopyTo(messageBuffer.GetMemory(result.Count));
                messageBuffer.Advance(result.Count);
            }

            if (result.EndOfMessage)
                return true;
        }
    }

    public static Task SendFrame(
        WebSocket socket,
        byte[] payload,
        CancellationToken cancellationToken
    )
    {
        return socket.SendAsync(payload, WebSocketMessageType.Binary, true, cancellationToken);
    }

    public static void EnsureFrameWithinLimit(int bodyLength)
    {
        if (bodyLength > HostBridgeDefaults.MaxFramePayloadBytes)
        {
            throw new InvalidDataException(
                $"host bridge frame exceeds limit of {HostBridgeDefaults.MaxFramePayloadBytes} bytes"
            );
        }
    }
}
