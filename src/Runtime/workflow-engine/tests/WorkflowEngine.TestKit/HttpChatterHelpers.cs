// CA1305: StringBuilder interpolation locale — plaintext HTTP output, not locale-sensitive
#pragma warning disable CA1305

using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
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

    // Standard GUID: 8-4-4-4-12 hex digits
    private static readonly Regex GuidPattern = new(
        @"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
        RegexOptions.IgnoreCase
    );

    // ISO 8601 timestamps (with or without JSON-escaped '+')
    private static readonly Regex TimestampPattern = new(
        @"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(\\u002B|\+)\d{2}:\d{2}"
    );

    // localhost:{port} — dynamic port numbers from WireMock / test servers
    private static readonly Regex LocalhostPortPattern = new(@"localhost:\d+");

    // One entry of a scrubbed JSON map keyed by workflow id, e.g. `        "Guid_2": "Completed",`. The value
    // pattern is deliberately narrow so a key whose value spans lines cannot be reordered.
    private static readonly Regex ScrubbedGuidEntryPattern = new(
        @"^(?<indent>[ \t]*)""Guid_(?<n>\d+)"": (?<value>""[^""\\]*""|-?\d+(?:\.\d+)?|true|false|null)(?<comma>,?)(?<cr>\r?)$"
    );

    // W3C traceparent / ProblemDetails traceId: version-traceId-spanId-flags (e.g. "00-{32 hex}-{16 hex}-01").
    // Surfaces in 4xx ProblemDetails responses regardless of whether the traceparent header was scrubbed.
    private static readonly Regex TraceParentPattern = new(
        @"\b[0-9a-f]{2}-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}\b",
        RegexOptions.IgnoreCase
    );

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
        http.AppendLine($"{req.Method} {req.Url} HTTP/1.1");
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

        // Body (blank line separates headers from body per HTTP spec)
        http.AppendLine();
        if (req.Body is { } body)
        {
            http.AppendLine(FormatJsonOrRaw(body));
            http.AppendLine();
        }
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
    /// Writes the request portion of a captured <see cref="HttpExchange"/> as HTTP plaintext.
    /// Use this to document inbound payload contracts in <c>*.inbound.http</c> snapshot files.
    /// </summary>
    public static void WriteInboundRequest(StringBuilder http, HttpExchange exchange)
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
            {
                if (ExcludedHeaders.Contains(header.Key))
                    continue;
                http.AppendLine($"{header.Key}: {string.Join(", ", header.Value)}");
            }
        }

        // Request body (blank line separates headers from body per HTTP spec)
        http.AppendLine();
        if (exchange.RequestBody is { Length: > 0 })
        {
            http.AppendLine(FormatJsonOrRaw(exchange.RequestBody));
            http.AppendLine();
        }
    }

    /// <summary>
    /// Writes the response portion of a captured <see cref="HttpExchange"/> as HTTP plaintext.
    /// </summary>
    public static void WriteInboundResponse(StringBuilder http, HttpExchange exchange)
    {
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
            {
                if (ExcludedHeaders.Contains(header.Key))
                    continue;
                http.AppendLine($"{header.Key}: {string.Join(", ", header.Value)}");
            }
        }

        // Response body
        http.AppendLine();
        if (exchange.ResponseBody is { Length: > 0 })
            http.AppendLine(FormatJsonOrRaw(exchange.ResponseBody));
    }

    /// <summary>
    /// Writes a captured <see cref="HttpExchange"/> (from <see cref="HttpExchangeRecorder"/>)
    /// as HTTP plaintext, auto-discovering all request and response headers. Use this for
    /// <c>*.exchange.http</c> snapshot files that document a full request/response pair.
    /// </summary>
    public static void WriteExchange(StringBuilder http, HttpExchange exchange)
    {
        WriteInboundRequest(http, exchange);
        WriteInboundResponse(http, exchange);
    }

    /// <summary>
    /// Scrubs volatile values from HTTP chatter text to produce deterministic output.
    /// Replaces GUIDs with sequential tokens (Guid_1, Guid_2, ...) like Verify does,
    /// timestamps with {Scrubbed}, and dynamic port numbers with {PORT}.
    /// Content-Length headers are already excluded at serialization time.
    /// </summary>
    public static string Scrub(string httpText)
    {
        // 1. Replace W3C trace IDs (different shape from UUIDs — no internal dashes in the 32-hex block).
        var result = TraceParentPattern.Replace(httpText, "{Scrubbed}");

        // 2. Replace GUIDs with stable sequential tokens (same GUID → same token)
        var guidMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        result = GuidPattern.Replace(
            result,
            match =>
            {
                var raw = match.Value;
                if (!guidMap.TryGetValue(raw, out var token))
                {
                    token = $"Guid_{guidMap.Count + 1}";
                    guidMap[raw] = token;
                }
                return token;
            }
        );

        // 3. Replace ISO 8601 timestamps
        result = TimestampPattern.Replace(result, "{Scrubbed}");

        // 4. Replace dynamic port numbers
        result = LocalhostPortPattern.Replace(result, "localhost:{PORT}");

        // 5. Put JSON objects keyed by workflow id in a fixed order
        result = SortScrubbedGuidMaps(result);

        return result;
    }

    /// <summary>
    /// Orders the entries of every JSON object whose keys are all scrubbed GUID tokens — the dependency graph's
    /// <c>dependencies</c>, <c>dependents</c> and <c>links</c>, which arrive in whatever order the join produced.
    /// Order is not part of what they mean, so the recorder fixes it rather than letting the snapshot dirty the
    /// working copy on runs that changed nothing. It has to happen <em>after</em> scrubbing: uuidv7 values minted
    /// inside one millisecond differ only in their random bits, while the scrubbed tokens are numbered by first
    /// appearance.
    /// </summary>
    private static string SortScrubbedGuidMaps(string text)
    {
        var lines = text.Split('\n');
        var output = new List<string>(lines.Length);

        var i = 0;
        while (i < lines.Length)
        {
            if (!ScrubbedGuidEntryPattern.IsMatch(lines[i]))
            {
                output.Add(lines[i]);
                i++;
                continue;
            }

            // A run of consecutive sibling entries is one map. Sort the entries by token number but keep each
            // slot's own punctuation, so an object that continues past the run stays syntactically intact.
            var slots = new List<Match>();
            while (i < lines.Length && ScrubbedGuidEntryPattern.Match(lines[i]) is { Success: true } match)
            {
                slots.Add(match);
                i++;
            }

            var entries = slots
                .Select(slot => (Token: int.Parse(slot.Groups["n"].Value), Value: slot.Groups["value"].Value))
                .OrderBy(entry => entry.Token)
                .ToArray();

            for (var slot = 0; slot < slots.Count; slot++)
            {
                output.Add(
                    slots[slot].Groups["indent"].Value
                        + $"\"Guid_{entries[slot].Token}\": "
                        + entries[slot].Value
                        + slots[slot].Groups["comma"].Value
                        + slots[slot].Groups["cr"].Value
                );
            }
        }

        return string.Join('\n', output);
    }

    /// <summary>
    /// Scrubs and persists HTTP chatter text to a .http snapshot file in the test project's .snapshots/ directory.
    /// <paramref name="snapshotFileName"/> may include a subdirectory (e.g. <c>"inbound/Foo.inbound.http"</c>);
    /// intermediate directories are created as needed.
    /// </summary>
    public static async Task PersistSnapshot(
        string httpText,
        string snapshotFileName,
        CancellationToken cancellationToken
    )
    {
        var scrubbed = Scrub(httpText);
        var snapshotDir = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".snapshots");
        var fullPath = Path.Combine(snapshotDir, snapshotFileName);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await File.WriteAllTextAsync(fullPath, scrubbed, cancellationToken);
    }
}
