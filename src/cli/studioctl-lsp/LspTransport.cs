using System.Buffers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using StreamJsonRpc;
using StreamJsonRpc.Protocol;

namespace Altinn.Studio.AppConfigLsp;

internal static class LspJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };
}

/// <summary>
/// Content-Length framed reads and writes over the raw streams, plus server-initiated
/// notifications and protocol-level error replies.
/// </summary>
internal sealed class LspTransport(Stream input, Stream output, Logger log)
{
    private readonly object _outLock = new();

    private sealed record NotificationEnvelope(string Jsonrpc, string Method, object Params);

    private sealed record ErrorEnvelope(
        string Jsonrpc,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] object? Id,
        ErrorDetail Error
    );

    private sealed record ErrorDetail(int Code, string Message);

    public void Notify(string method, object parameters)
    {
        log.Log(LogLevel.Trace, $"send {method}");
        WriteFrame(
            JsonSerializer.SerializeToUtf8Bytes(new NotificationEnvelope("2.0", method, parameters), LspJson.Options)
        );
    }

    public void WriteParseError()
    {
        var envelope = new ErrorEnvelope("2.0", null, new ErrorDetail(-32700, "Parse error"));
        WriteFrame(JsonSerializer.SerializeToUtf8Bytes(envelope, LspJson.Options));
    }

    public void WriteFrame(ReadOnlySpan<byte> body)
    {
        var header = Encoding.ASCII.GetBytes($"Content-Length: {body.Length}\r\n\r\n");
        lock (_outLock)
        {
            output.Write(header);
            output.Write(body);
            output.Flush();
        }
    }

    public byte[]? ReadFrame()
    {
        var contentLength = -1;
        for (var line = ReadLine(); !string.IsNullOrEmpty(line); line = ReadLine())
        {
            var colon = line.IndexOf(':');
            if (
                colon > 0
                && line[..colon].Trim().Equals("Content-Length", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(line[(colon + 1)..].Trim(), out var parsed)
            )
                contentLength = parsed;
        }
        if (contentLength < 0)
            return null;

        var buffer = new byte[contentLength];
        var read = 0;
        while (read < contentLength)
        {
            var n = input.Read(buffer, read, contentLength - read);
            if (n <= 0)
                return null;
            read += n;
        }
        return buffer;
    }

    private string? ReadLine()
    {
        var sb = new StringBuilder();
        while (true)
        {
            var b = input.ReadByte();
            if (b < 0)
                return sb.Length == 0 ? null : sb.ToString();
            if (b == '\n')
            {
                if (sb.Length > 0 && sb[^1] == '\r')
                    sb.Length--;
                return sb.ToString();
            }
            sb.Append((char)b);
        }
    }
}

// JsonRpc treats end-of-input as loss of the whole connection and stops responding to
// requests it has already received, so EOF is held back until every read request has had
// its response written.
internal sealed class FrameHandler(LspTransport transport, Logger log, SystemTextJsonFormatter formatter)
    : IJsonRpcMessageHandler
{
    private readonly object _gate = new();
    private int _pendingResponses;

    public bool CanRead => true;
    public bool CanWrite => true;
    public IJsonRpcMessageFormatter Formatter => formatter;

    public ValueTask<JsonRpcMessage?> ReadAsync(CancellationToken cancellationToken)
    {
        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var body = transport.ReadFrame();
            if (body is null)
            {
                lock (_gate)
                {
                    while (_pendingResponses > 0)
                        Monitor.Wait(_gate);
                }
                return ValueTask.FromResult<JsonRpcMessage?>(null);
            }
            try
            {
                var message = formatter.Deserialize(new ReadOnlySequence<byte>(body));
                if (message is JsonRpcRequest { IsResponseExpected: true })
                    lock (_gate)
                        _pendingResponses++;
                return ValueTask.FromResult<JsonRpcMessage?>(message);
            }
            catch (JsonException ex)
            {
                log.Log(LogLevel.Error, $"malformed frame: {ex.Message}");
                transport.WriteParseError();
            }
        }
    }

    public ValueTask WriteAsync(JsonRpcMessage jsonRpcMessage, CancellationToken cancellationToken)
    {
        var buffer = new ArrayBufferWriter<byte>();
        formatter.Serialize(buffer, jsonRpcMessage);
        transport.WriteFrame(buffer.WrittenSpan);
        if (jsonRpcMessage is JsonRpcResult or JsonRpcError)
            lock (_gate)
            {
                _pendingResponses--;
                Monitor.PulseAll(_gate);
            }
        return ValueTask.CompletedTask;
    }
}
