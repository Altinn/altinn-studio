#nullable enable

using System.Buffers.Binary;
using System.IO;
using System.Net.WebSockets;
using System.Text.Json;

namespace Altinn.Studio.AppTunnel;

public enum TunnelFrameKind : byte
{
    RequestStart = 1,
    RequestBody = 2,
    ResponseStart = 3,
    ResponseBody = 4,
    Cancel = 5,
    Error = 6,
}

public sealed record RequestStartFrame(
    long RequestId,
    string Method,
    string PathAndQuery,
    Dictionary<string, string[]> Headers
);

public sealed record ResponseStartFrame(
    long RequestId,
    int StatusCode,
    Dictionary<string, string[]> Headers
);

public sealed record ErrorFrame(long RequestId, string Message);

public readonly record struct BodyFrame(long RequestId, bool IsFinal, byte[] Payload);

public static class TunnelDefaults
{
    public const string EndpointPath = "/internal/tunnel/app";

    // The first cut is buffered. This keeps the protocol simple while we validate the topology end-to-end.
    public const int MaxBufferedBodyBytes = 32 * 1024 * 1024;
}

public static class TunnelProtocol
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static TunnelFrameKind ReadKind(ReadOnlySpan<byte> message)
    {
        if (message.Length < 1)
        {
            throw new InvalidDataException("empty tunnel frame");
        }

        return (TunnelFrameKind)message[0];
    }

    public static byte[] WriteJsonFrame<T>(TunnelFrameKind kind, T payload)
    {
        var json = JsonSerializer.SerializeToUtf8Bytes(payload, JsonOptions);
        var frame = new byte[json.Length + 1];
        frame[0] = (byte)kind;
        json.CopyTo(frame.AsSpan(1));
        return frame;
    }

    public static T ReadJsonFrame<T>(TunnelFrameKind expectedKind, ReadOnlySpan<byte> message)
    {
        var kind = ReadKind(message);
        if (kind != expectedKind)
        {
            throw new InvalidDataException($"unexpected tunnel frame kind {kind}, expected {expectedKind}");
        }

        return JsonSerializer.Deserialize<T>(message[1..], JsonOptions)
            ?? throw new InvalidDataException("invalid tunnel json frame");
    }

    public static byte[] WriteBodyFrame(
        TunnelFrameKind kind,
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

    public static BodyFrame ReadBodyFrame(TunnelFrameKind expectedKind, ReadOnlySpan<byte> message)
    {
        var kind = ReadKind(message);
        if (kind != expectedKind)
        {
            throw new InvalidDataException($"unexpected tunnel frame kind {kind}, expected {expectedKind}");
        }

        if (message.Length < 10)
        {
            throw new InvalidDataException("invalid tunnel body frame");
        }

        var requestId = BinaryPrimitives.ReadInt64LittleEndian(message.Slice(1, 8));
        var isFinal = message[9] != 0;
        return new BodyFrame(requestId, isFinal, message[10..].ToArray());
    }

    public static async Task<byte[]?> ReadMessageAsync(
        WebSocket socket,
        CancellationToken cancellationToken
    )
    {
        var buffer = new byte[8192];
        using var content = new MemoryStream();

        while (true)
        {
            var result = await socket.ReceiveAsync(buffer, cancellationToken);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                return null;
            }

            if (result.MessageType != WebSocketMessageType.Binary)
            {
                throw new InvalidDataException("app tunnel only supports binary websocket messages");
            }

            await content.WriteAsync(buffer.AsMemory(0, result.Count), cancellationToken);
            if (result.EndOfMessage)
            {
                return content.ToArray();
            }
        }
    }

    public static Task SendFrameAsync(
        WebSocket socket,
        byte[] payload,
        CancellationToken cancellationToken
    )
    {
        return socket.SendAsync(payload, WebSocketMessageType.Binary, true, cancellationToken);
    }

    public static void EnsureBodyWithinLimit(int bodyLength)
    {
        if (bodyLength > TunnelDefaults.MaxBufferedBodyBytes)
        {
            throw new InvalidDataException(
                $"tunnel body exceeds limit of {TunnelDefaults.MaxBufferedBodyBytes} bytes"
            );
        }
    }
}
