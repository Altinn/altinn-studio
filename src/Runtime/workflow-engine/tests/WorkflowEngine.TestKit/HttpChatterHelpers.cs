using System.Text;
using System.Text.Json;
using WireMock.Logging;
using WireMock.Types;
using WorkflowEngine.Models;

namespace WorkflowEngine.TestKit;

/// <summary>
/// Shared helpers for HTTP chatter documentation tests.
/// Provides WireMock header extraction, JSON formatting, and HTTP text serialization.
/// </summary>
public static class HttpChatterHelpers
{
    private static readonly JsonSerializerOptions s_indentedJson = new() { WriteIndented = true };

    /// <summary>
    /// Headers to exclude from HTTP chatter output (transport/tracing noise).
    /// </summary>
    private static readonly HashSet<string> ExcludedHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Host",
        "Transfer-Encoding",
        "Content-Length",
        "Connection",
        "Accept",
        "traceparent",
        "tracestate",
    };

    /// <summary>
    /// Extracts a single header value from a WireMock headers dictionary (case-insensitive).
    /// Returns "(missing)" if not found.
    /// </summary>
    public static string GetHeader(IDictionary<string, WireMockList<string>>? headers, string name)
    {
        if (headers is null)
            return "(missing)";

        if (headers.TryGetValue(name, out var values))
            return values.FirstOrDefault() ?? "(missing)";

        var match = headers.FirstOrDefault(kvp => string.Equals(kvp.Key, name, StringComparison.OrdinalIgnoreCase));
        return match.Value?.FirstOrDefault() ?? "(missing)";
    }

    /// <summary>
    /// Pretty-prints JSON content, or returns the raw string if it's not valid JSON.
    /// </summary>
    public static string FormatJsonOrRaw(string content)
    {
        try
        {
            using var doc = JsonDocument.Parse(content);
            return JsonSerializer.Serialize(doc, s_indentedJson);
        }
        catch
        {
            return content;
        }
    }

    /// <summary>
    /// Serializes JSON to indented format.
    /// </summary>
    public static string SerializeIndented<T>(T value) => JsonSerializer.Serialize(value, s_indentedJson);

    /// <summary>
    /// Writes a WireMock-captured request as HTTP plaintext, auto-discovering headers.
    /// Emits Host first, then all non-transport headers in alphabetical order.
    /// </summary>
    public static void WriteRequest(StringBuilder http, ILogEntry log)
    {
        var req = log.RequestMessage;
        var headers = req.Headers;

        // Request line
        http.AppendLine($"{req.Method} {req.AbsolutePath} HTTP/1.1");
        http.AppendLine($"Host: {req.Host}");

        // Emit all non-transport headers in alphabetical order
        if (headers is not null)
        {
            foreach (var (name, values) in headers.OrderBy(h => h.Key, StringComparer.OrdinalIgnoreCase))
            {
                if (ExcludedHeaders.Contains(name))
                    continue;

                http.AppendLine($"{name}: {values.FirstOrDefault()}");
            }
        }

        // Body
        http.AppendLine();
        if (req.Body is { } body)
            http.AppendLine(FormatJsonOrRaw(body));
    }

    /// <summary>
    /// Writes a WireMock-captured response as HTTP plaintext.
    /// </summary>
    public static void WriteResponse(StringBuilder http, ILogEntry log)
    {
        var resp = log.ResponseMessage;
        http.AppendLine($"HTTP/1.1 {resp.StatusCode}");

        if (resp.BodyData?.BodyAsString is { } responseBody)
        {
            var contentType = resp.Headers?.FirstOrDefault(h =>
                string.Equals(h.Key, "Content-Type", StringComparison.OrdinalIgnoreCase)
            );
            if (contentType is { Value: { } ctValues })
                http.AppendLine($"Content-Type: {ctValues.FirstOrDefault()}");
            http.AppendLine();
            http.AppendLine(FormatJsonOrRaw(responseBody));
        }
    }

    /// <summary>
    /// Writes a captured <see cref="HttpExchange"/> (from <see cref="HttpExchangeRecorder"/>)
    /// as HTTP plaintext, auto-discovering all request and response headers.
    /// </summary>
    public static void WriteExchange(StringBuilder http, HttpExchange exchange)
    {
        var req = exchange.Request;

        // Request line
        http.AppendLine($"{req.Method} {req.RequestUri?.PathAndQuery} HTTP/1.1");

        // Request headers (all of them — from both request and content headers)
        foreach (var header in req.Headers.OrderBy(h => h.Key, StringComparer.OrdinalIgnoreCase))
        {
            if (ExcludedHeaders.Contains(header.Key))
                continue;
            http.AppendLine($"{header.Key}: {string.Join(", ", header.Value)}");
        }

        if (req.Content is not null)
        {
            foreach (var header in req.Content.Headers.OrderBy(h => h.Key, StringComparer.OrdinalIgnoreCase))
                http.AppendLine($"{header.Key}: {string.Join(", ", header.Value)}");
        }

        // Request body
        http.AppendLine();
        if (exchange.RequestBody is { Length: > 0 })
            http.AppendLine(FormatJsonOrRaw(exchange.RequestBody));

        var resp = exchange.Response;

        // Response status line
        http.AppendLine($"HTTP/1.1 {(int)resp.StatusCode} {resp.ReasonPhrase}");

        // Response headers
        foreach (var header in resp.Headers.OrderBy(h => h.Key, StringComparer.OrdinalIgnoreCase))
        {
            if (ExcludedHeaders.Contains(header.Key))
                continue;
            http.AppendLine($"{header.Key}: {string.Join(", ", header.Value)}");
        }

        if (resp.Content is not null)
        {
            foreach (var header in resp.Content.Headers.OrderBy(h => h.Key, StringComparer.OrdinalIgnoreCase))
                http.AppendLine($"{header.Key}: {string.Join(", ", header.Value)}");
        }

        // Response body
        http.AppendLine();
        if (exchange.ResponseBody is { Length: > 0 })
            http.AppendLine(FormatJsonOrRaw(exchange.ResponseBody));
    }
}
