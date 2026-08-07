using System.Net;
using System.Net.Http.Headers;
using System.Text;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// An immutable snapshot of an HTTP response received from the Altinn Platform.
/// </summary>
/// <remarks>
/// <para>
/// This type holds no live network resources. The body has already been read and bounded, sensitive
/// headers have been redacted, and the originating <see cref="HttpResponseMessage"/> may safely have
/// been disposed. It is therefore safe to log, persist, and hold for the lifetime of an exception —
/// unlike an <see cref="HttpResponseMessage"/>, whose content stream is only valid until the
/// originating request scope ends.
/// </para>
/// </remarks>
public sealed record PlatformHttpResponse
{
    /// <summary>
    /// The maximum number of characters captured from a response body. Bodies longer than this are
    /// truncated and <see cref="ContentTruncated"/> is set.
    /// </summary>
    public const int MaxCapturedContentLength = 16 * 1024;

    private const string RedactedValue = "[REDACTED]";

    private static readonly HashSet<string> _redactedHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Authorization",
        "Proxy-Authorization",
        "Cookie",
        "Set-Cookie",
    };

    private static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> _emptyHeaders = new Dictionary<
        string,
        IReadOnlyList<string>
    >(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// The HTTP status code of the response.
    /// </summary>
    public required HttpStatusCode StatusCode { get; init; }

    /// <summary>
    /// The reason phrase sent by the server, if any.
    /// </summary>
    public string? ReasonPhrase { get; init; }

    /// <summary>
    /// The response body as text, capped at <see cref="MaxCapturedContentLength"/> characters.
    /// </summary>
    /// <remarks>
    /// Empty when the response had no body, or when the snapshot was taken without reading it (see
    /// <see cref="FromHttpResponse"/>). For non-textual bodies this is a short descriptor such as
    /// <c>&lt;application/pdf; 40213 bytes&gt;</c> rather than the raw payload, so that a failed binary
    /// download does not pull megabytes into an exception message.
    /// </remarks>
    public string Content { get; init; } = string.Empty;

    /// <summary>
    /// Whether <see cref="Content"/> was truncated because the body exceeded
    /// <see cref="MaxCapturedContentLength"/>.
    /// </summary>
    public bool ContentTruncated { get; init; }

    /// <summary>
    /// The response, content and trailing headers, merged. Sensitive headers (<c>Authorization</c>,
    /// <c>Proxy-Authorization</c>, <c>Cookie</c>, <c>Set-Cookie</c>) have their values redacted.
    /// </summary>
    public IReadOnlyDictionary<string, IReadOnlyList<string>> Headers { get; init; } = _emptyHeaders;

    /// <summary>
    /// Captures status, reason phrase and headers from <paramref name="response"/> without reading its
    /// body.
    /// </summary>
    /// <remarks>
    /// Use this when the body has already been consumed, or is not wanted — pass it as
    /// <paramref name="content"/> if you have it. To have the body read for you, use
    /// <see cref="PlatformHttpException.Create(HttpResponseMessage, CancellationToken)"/> instead.
    /// </remarks>
    /// <param name="response">The response to snapshot.</param>
    /// <param name="content">The already-read response body, if available.</param>
    internal static PlatformHttpResponse FromHttpResponse(HttpResponseMessage response, string? content = null)
    {
        ArgumentNullException.ThrowIfNull(response);

        return new PlatformHttpResponse
        {
            StatusCode = response.StatusCode,
            ReasonPhrase = response.ReasonPhrase,
            Content = content ?? string.Empty,
            Headers = SnapshotHeaders(response),
        };
    }

    /// <summary>
    /// Captures the full response, reading the body with a bounded, streaming read.
    /// </summary>
    internal static async Task<PlatformHttpResponse> Snapshot(
        HttpResponseMessage response,
        CancellationToken cancellationToken
    )
    {
        (string content, bool truncated) = await ReadContentSnapshot(
            response.Content,
            MaxCapturedContentLength,
            cancellationToken
        );

        return new PlatformHttpResponse
        {
            StatusCode = response.StatusCode,
            ReasonPhrase = response.ReasonPhrase,
            Content = content,
            ContentTruncated = truncated,
            Headers = SnapshotHeaders(response),
        };
    }

    /// <summary>
    /// Renders the snapshot the way it appears in an exception message: <c>"404 - Not Found - {body}"</c>.
    /// </summary>
    internal string BuildMessage()
    {
        var builder = new StringBuilder()
            .Append((int)StatusCode)
            .Append(" - ")
            .Append(ReasonPhrase)
            .Append(" - ")
            .Append(Content);

        if (ContentTruncated)
            builder.Append("… [truncated]");

        return builder.ToString();
    }

    private static IReadOnlyDictionary<string, IReadOnlyList<string>> SnapshotHeaders(HttpResponseMessage response)
    {
        var headers = new Dictionary<string, IReadOnlyList<string>>(StringComparer.OrdinalIgnoreCase);

        Merge(response.Headers);
        Merge(response.Content?.Headers);
        Merge(response.TrailingHeaders);

        return headers.Count == 0 ? _emptyHeaders : headers;

        void Merge(HttpHeaders? source)
        {
            if (source is null)
                return;

            foreach ((string key, IEnumerable<string> values) in source)
            {
                headers[key] = _redactedHeaders.Contains(key) ? [RedactedValue] : [.. values];
            }
        }
    }

    /// <summary>
    /// Reads the body in a streaming fashion, up to <paramref name="maxChars"/> characters. Non-textual
    /// bodies are summarized rather than read, so that binary payloads are never buffered.
    /// </summary>
    private static async Task<(string Content, bool Truncated)> ReadContentSnapshot(
        HttpContent? httpContent,
        int maxChars,
        CancellationToken cancellationToken
    )
    {
        if (httpContent is null)
            return (string.Empty, false);

        // A missing media type is treated as textual: error responses frequently omit it.
        string? mediaType = httpContent.Headers?.ContentType?.MediaType;
        bool isTextual =
            mediaType is null
            || mediaType.StartsWith("text/", StringComparison.OrdinalIgnoreCase)
            || mediaType.Equals("application/json", StringComparison.OrdinalIgnoreCase)
            || mediaType.Equals("application/xml", StringComparison.OrdinalIgnoreCase)
            || mediaType.EndsWith("+json", StringComparison.OrdinalIgnoreCase)
            || mediaType.EndsWith("+xml", StringComparison.OrdinalIgnoreCase);

        if (!isTextual)
        {
            long? contentLength = httpContent.Headers?.ContentLength;
            string length = contentLength.HasValue ? $"{contentLength.Value} bytes" : "unknown size";
            return ($"<{mediaType}; {length}>", false);
        }

        Encoding encoding = Encoding.UTF8;
        string? charset = httpContent.Headers?.ContentType?.CharSet;
        if (!string.IsNullOrWhiteSpace(charset))
        {
            try
            {
                encoding = Encoding.GetEncoding(charset);
            }
            catch (Exception e) when (e is ArgumentException or NotSupportedException)
            {
                // A charset the platform does not provide (many code pages need
                // CodePagesEncodingProvider on modern .NET, and unsupported ones raise
                // NotSupportedException rather than ArgumentException). This runs while building an
                // exception, so it must never throw itself and mask the failure being reported —
                // UTF-8 is the best available guess.
            }
        }

        using Stream stream = await httpContent.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(
            stream,
            encoding,
            detectEncodingFromByteOrderMarks: true,
            bufferSize: 1024,
            // The `using` above owns the stream; letting the reader close it too would dispose it twice.
            leaveOpen: true
        );

        char[] buffer = new char[maxChars];
        int read = 0;
        while (read < maxChars)
        {
            int count = await reader.ReadAsync(buffer.AsMemory(read, maxChars - read), cancellationToken);
            if (count == 0)
                break;
            read += count;
        }

        bool truncated = reader.Peek() != -1;
        return (new string(buffer, 0, read), truncated);
    }

    /// <summary>
    /// A compact description. The body is deliberately omitted: it can be up to
    /// <see cref="MaxCapturedContentLength"/> characters, which would swamp any log line that
    /// interpolates the snapshot.
    /// </summary>
    public override string ToString() =>
        $"{nameof(PlatformHttpResponse)} {{ StatusCode = {(int)StatusCode}, ReasonPhrase = {ReasonPhrase}, ContentLength = {Content.Length}, ContentTruncated = {ContentTruncated} }}";
}
