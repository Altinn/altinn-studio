using System.Net.Http.Headers;
using System.Text;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Exception that represents a failed HTTP call to the Altinn Platform,
/// containing an immutable snapshot of the HTTP response, while remaining
/// backward compatible with <see cref="PlatformHttpException"/>.
/// <para>
/// This class derives from <see cref="PlatformHttpException"/> so existing
/// catch blocks continue to work. It passes a sanitized, non-streaming
/// <see cref="HttpResponseMessage"/> to the base class to avoid keeping any
/// live network resources, and it exposes string-based snapshot properties
/// for safe logging and persistence.
/// </para>
/// </summary>
internal sealed class PlatformHttpResponseSnapshotException : PlatformHttpException
{
    /// <summary>
    /// The maximum number of characters captured from the response content.
    /// </summary>
    private const int MaxCapturedContentLength = 16 * 1024; // 16 KB

    /// <summary>
    /// Gets the numeric HTTP status code.
    /// </summary>
    public int StatusCode { get; }

    /// <summary>
    /// Gets the reason phrase sent by the server, if any.
    /// </summary>
    public string? ReasonPhrase { get; }

    /// <summary>
    /// Gets the HTTP version used by the response (e.g. "1.1", "2.0").
    /// </summary>
    public string HttpVersion { get; }

    /// <summary>
    /// Gets a flattened string representation of all response, content, and trailing headers.
    /// </summary>
    public string Headers { get; }

    /// <summary>
    /// Gets the response body content as a string (possibly truncated).
    /// </summary>
    public string Content { get; }

    /// <summary>
    /// Gets a value indicating whether the content was truncated due to the configured maximum length.
    /// </summary>
    public bool ContentTruncated { get; }

    private const string Redacted = "[REDACTED]";

    /// <summary>
    /// Creates a new <see cref="PlatformHttpResponseSnapshotException"/> by snapshotting
    /// the provided <see cref="HttpResponseMessage"/> into immutable string values,
    /// constructing a sanitized clone for the base class, and then disposing the original response.
    /// </summary>
    /// <param name="response">The HTTP response to snapshot and dispose.</param>
    /// <param name="cancellationToken">A cancellation token to cancel reading the content.</param>
    /// <returns>The constructed <see cref="PlatformHttpResponseSnapshotException"/>.</returns>
    public static async Task<PlatformHttpResponseSnapshotException> CreateAndDisposeHttpResponse(
        HttpResponseMessage response,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(response);

        try
        {
            // Snapshot content with bounded streaming to avoid loading large responses into memory
            (string content, bool truncated) = await ReadContentSnapshotAsync(
                response.Content,
                MaxCapturedContentLength,
                cancellationToken
            );

            string message = BuildMessage((int)response.StatusCode, response.ReasonPhrase, content, truncated);

            return Create(message, response, content, truncated);
        }
        finally
        {
            try
            {
                response.Dispose();
            }
            catch
            {
                /* ignore dispose failures */
            }
        }
    }

    /// <summary>
    /// Creates a new <see cref="PlatformHttpResponseSnapshotException"/> by snapshotting
    /// the provided <see cref="HttpResponseMessage"/> into immutable string values,
    /// constructing a sanitized clone for the base class.
    /// </summary>
    /// <param name="message">The exception message.</param>
    /// <param name="response">The HTTP response to snapshot.</param>
    /// <param name="content">The response body content as a string (possibly truncated).</param>
    /// <param name="contentTruncated">Whether the content was truncated.</param>
    /// <returns>The constructed <see cref="PlatformHttpResponseSnapshotException"/>.</returns>
    public static PlatformHttpResponseSnapshotException Create(
        string message,
        HttpResponseMessage response,
        string? content = null,
        bool contentTruncated = false
    )
    {
        string headers = FlattenHeaders(response.Headers, response.Content?.Headers, response.TrailingHeaders);
        content ??= string.Empty;

        // Build a sanitized, non-streaming HttpResponseMessage for the base class
        var safeResponse = new HttpResponseMessage(response.StatusCode)
        {
            ReasonPhrase = response.ReasonPhrase,
            Version = response.Version,
        };

        // Copy normal headers
        foreach (KeyValuePair<string, IEnumerable<string>> h in response.Headers)
        {
            if (_redactedHeaders.Contains(h.Key))
            {
                safeResponse.Headers.TryAddWithoutValidation(h.Key, [Redacted]);
            }
            else
            {
                safeResponse.Headers.TryAddWithoutValidation(h.Key, h.Value);
            }
        }

        // Attach a diagnostic snapshot body for legacy consumers
        StringContent safeContent = new StringContent(content, Encoding.UTF8);
        safeContent.Headers.ContentType = response.Content?.Headers?.ContentType;
        safeResponse.Content = safeContent;

        // Copy trailing headers if present (HTTP/2+)
        foreach (KeyValuePair<string, IEnumerable<string>> h in response.TrailingHeaders)
        {
            if (_redactedHeaders.Contains(h.Key))
            {
                safeResponse.TrailingHeaders.TryAddWithoutValidation(h.Key, [Redacted]);
            }
            else
            {
                safeResponse.TrailingHeaders.TryAddWithoutValidation(h.Key, h.Value);
            }
        }

        return new PlatformHttpResponseSnapshotException(
            safeResponse,
            statusCode: (int)response.StatusCode,
            reasonPhrase: response.ReasonPhrase,
            httpVersion: response.Version?.ToString() ?? string.Empty,
            headers: headers,
            content: content,
            contentTruncated: contentTruncated,
            message: message
        );
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformHttpResponseSnapshotException"/> class.
    /// </summary>
    /// <param name="safeResponse">A sanitized, non-streaming <see cref="HttpResponseMessage"/> suitable for legacy consumers.</param>
    /// <param name="statusCode">The numeric HTTP status code.</param>
    /// <param name="reasonPhrase">The reason phrase sent by the server, if any.</param>
    /// <param name="httpVersion">The HTTP version used by the response.</param>
    /// <param name="headers">A flattened string representation of response, content, and trailing headers.</param>
    /// <param name="content">The response body content as a string (possibly truncated).</param>
    /// <param name="contentTruncated">Whether the content was truncated.</param>
    /// <param name="message">The exception message.</param>
    private PlatformHttpResponseSnapshotException(
        HttpResponseMessage safeResponse,
        int statusCode,
        string? reasonPhrase,
        string httpVersion,
        string headers,
        string content,
        bool contentTruncated,
        string message
    )
        : base(safeResponse, message)
    {
        StatusCode = statusCode;
        ReasonPhrase = reasonPhrase;
        HttpVersion = string.IsNullOrEmpty(httpVersion) ? string.Empty : httpVersion;
        Headers = headers;
        Content = content;
        ContentTruncated = contentTruncated;
    }

    /// <summary>
    /// Reads and snapshots the HTTP content in a streaming fashion, up to a maximum number of characters.
    /// For binary content, returns a summary. For textual content, reads only the required amount to avoid unbounded buffering.
    /// </summary>
    /// <param name="httpContent">The HTTP content to read, or null.</param>
    /// <param name="maxChars">The maximum number of characters to capture.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the read operation.</param>
    /// <returns>A tuple containing the content snapshot and a flag indicating whether it was truncated.</returns>
    private static async Task<(string content, bool truncated)> ReadContentSnapshotAsync(
        HttpContent? httpContent,
        int maxChars,
        CancellationToken cancellationToken
    )
    {
        if (httpContent is null)
        {
            return (string.Empty, false);
        }

        // Check if content is textual based on Content-Type
        // Default to textual if no media type is specified (common for error responses)
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
            // For binary content, return a summary instead of trying to read it as text
            long? contentLength = httpContent.Headers?.ContentLength;
            string lengthStr = contentLength.HasValue ? $"{contentLength.Value} bytes" : "unknown size";
            return ($"<{mediaType}; {lengthStr}>", false);
        }

        // For textual content, stream with bounded buffer to avoid loading entire response into memory
        using Stream stream = await httpContent.ReadAsStreamAsync(cancellationToken);
        Encoding encoding = Encoding.UTF8;
        string? charset = httpContent.Headers?.ContentType?.CharSet;
        if (!string.IsNullOrWhiteSpace(charset))
        {
            try
            {
                encoding = Encoding.GetEncoding(charset);
            }
            catch
            {
                // Fallback to UTF8 if charset is invalid
            }
        }

        using StreamReader reader = new StreamReader(
            stream,
            encoding,
            detectEncodingFromByteOrderMarks: true,
            bufferSize: 1024,
            leaveOpen: false
        );

        // Allocate buffer for exactly maxChars characters and read in loop to ensure buffer is filled
        char[] buffer = new char[maxChars];
        int read = 0;
        while (read < maxChars)
        {
            int n = await reader.ReadAsync(buffer.AsMemory(read, maxChars - read), cancellationToken);
            if (n == 0)
                break;
            read += n;
        }

        // Check if there's more content to determine truncation
        bool hasMore = reader.Peek() != -1;
        return (new string(buffer, 0, read), hasMore);
    }

    private static string BuildMessage(int statusCode, string? reason, string content, bool truncated)
    {
        StringBuilder sb = new StringBuilder().Append(statusCode).Append(' ').Append(reason ?? string.Empty);
        if (string.IsNullOrEmpty(content))
            return sb.ToString();

        sb.Append(" - ").Append(content);
        if (truncated)
            sb.Append("… [truncated]");
        return sb.ToString();
    }

    private static string FlattenHeaders(
        HttpResponseHeaders? responseHeaders,
        HttpContentHeaders? contentHeaders,
        HttpResponseHeaders? trailingHeaders
    )
    {
        var sb = new StringBuilder();

        Append("Headers", responseHeaders);
        Append("Content-Headers", contentHeaders);
        Append("Trailing-Headers", trailingHeaders);

        return sb.ToString();

        void Append(string prefix, IEnumerable<KeyValuePair<string, IEnumerable<string>>>? headers)
        {
            if (headers is null)
                return;
            foreach ((string key, IEnumerable<string> values) in headers)
            {
                string display = _redactedHeaders.Contains(key) ? Redacted : string.Join(", ", values);
                sb.Append(prefix).Append(": ").Append(key).Append(": ").AppendLine(display);
            }
        }
    }

    private static readonly HashSet<string> _redactedHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Authorization",
        "Proxy-Authorization",
        "Cookie",
        "Set-Cookie",
    };
}
