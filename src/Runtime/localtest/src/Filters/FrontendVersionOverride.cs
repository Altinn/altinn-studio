#nullable enable

using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using Microsoft.Net.Http.Headers;

namespace LocalTest.Filters;

internal sealed class FrontendVersionOverride
{
    private const string CookieName = "frontendVersion";

    private static readonly Regex FrontendResourceRegex = new(
        @"(https?://[^""'\s]*/)(altinn-app-frontend\.(js|css))",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    private readonly string _url;
    private readonly ILogger _logger;

    private FrontendVersionOverride(string url, ILogger logger)
    {
        _url = url;
        _logger = logger;
    }

    public static FrontendVersionOverride? FromRequest(HttpContext context, ILogger logger)
    {
        if (!context.Request.Cookies.TryGetValue(CookieName, out var cookieValue))
        {
            return null;
        }

        if (string.IsNullOrEmpty(cookieValue))
        {
            return null;
        }

        try
        {
            return new FrontendVersionOverride(HttpUtility.UrlDecode(cookieValue), logger);
        }
        catch
        {
            return null;
        }
    }

    public bool ShouldRewrite(HttpResponseMessage proxyResponse) =>
        IsHtmlResponse(proxyResponse.Content?.Headers?.ContentType?.MediaType);

    public async Task<bool> RewriteBufferedResponse(
        HttpContext httpContext,
        Stream body,
        CancellationToken cancellationToken
    )
    {
        if (!IsHtmlResponse(httpContext.Response.ContentType))
        {
            return false;
        }

        var contentEncodings = GetContentEncodings(httpContext.Response.Headers);
        var charset = GetCharset(httpContext.Response.ContentType);
        return await Rewrite(httpContext, body, contentEncodings, charset, cancellationToken);
    }

    public async Task<bool> RewriteResponse(
        HttpContext httpContext,
        HttpResponseMessage proxyResponse,
        CancellationToken cancellationToken
    )
    {
        if (proxyResponse.Content == null)
        {
            return false;
        }

        await using var contentStream = await proxyResponse.Content.ReadAsStreamAsync(cancellationToken);
        return await Rewrite(
            httpContext,
            contentStream,
            proxyResponse.Content.Headers.ContentEncoding,
            proxyResponse.Content.Headers.ContentType?.CharSet,
            cancellationToken
        );
    }

    private async Task<bool> Rewrite(
        HttpContext httpContext,
        Stream contentStream,
        ICollection<string> contentEncodings,
        string? charset,
        CancellationToken cancellationToken
    )
    {
        var decodedStream = CreateDecodingStream(contentStream, contentEncodings);
        if (decodedStream is null)
        {
            _logger.LogWarning(
                "Skipping frontend rewrite due to unsupported content encoding: {ContentEncoding}",
                string.Join(", ", contentEncodings)
            );
            return false;
        }

        using var decodedStreamScope = decodedStream;
        var encoding = GetContentEncoding(charset);
        using var reader = new StreamReader(decodedStreamScope, encoding, detectEncodingFromByteOrderMarks: true);
        var originalContent = await reader.ReadToEndAsync(cancellationToken);

        var modifiedContent = FrontendResourceRegex.Replace(
            originalContent,
            match => _url + match.Groups[2].Value
        );

        if (modifiedContent != originalContent)
        {
            _logger.LogDebug("Rewrote frontend resources to use version URL: {FrontendVersionUrl}", _url);
        }

        httpContext.Response.Headers.Remove(HeaderNames.ContentEncoding);

        var bytes = Encoding.UTF8.GetBytes(modifiedContent);
        httpContext.Response.ContentLength = bytes.Length;
        await httpContext.Response.Body.WriteAsync(bytes, cancellationToken);
        return true;
    }

    private static bool IsHtmlResponse(string? mediaType)
    {
        if (string.IsNullOrWhiteSpace(mediaType))
        {
            return false;
        }

        return mediaType.StartsWith("text/html", StringComparison.OrdinalIgnoreCase);
    }

    private static Stream? CreateDecodingStream(Stream contentStream, ICollection<string> contentEncodings)
    {
        if (contentEncodings.Count == 0)
        {
            return contentStream;
        }

        var encodingStack = new Stack<string>(contentEncodings);
        Stream decodedStream = contentStream;

        while (encodingStack.Count > 0)
        {
            var encoding = encodingStack.Pop();
            if (string.Equals(encoding, "gzip", StringComparison.OrdinalIgnoreCase))
            {
                decodedStream = new GZipStream(decodedStream, CompressionMode.Decompress, leaveOpen: false);
                continue;
            }

            if (string.Equals(encoding, "br", StringComparison.OrdinalIgnoreCase))
            {
                decodedStream = new BrotliStream(decodedStream, CompressionMode.Decompress, leaveOpen: false);
                continue;
            }

            if (string.Equals(encoding, "deflate", StringComparison.OrdinalIgnoreCase))
            {
                decodedStream = new DeflateStream(decodedStream, CompressionMode.Decompress, leaveOpen: false);
                continue;
            }

            return null;
        }

        return decodedStream;
    }

    private Encoding GetContentEncoding(string? charset)
    {
        if (string.IsNullOrWhiteSpace(charset))
        {
            return Encoding.UTF8;
        }

        try
        {
            return Encoding.GetEncoding(charset);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Unsupported charset '{Charset}', using UTF-8", charset);
            return Encoding.UTF8;
        }
    }

    private static string? GetCharset(string? contentType)
    {
        if (
            string.IsNullOrWhiteSpace(contentType)
            || !MediaTypeHeaderValue.TryParse(contentType, out var mediaType)
        )
        {
            return null;
        }

        return mediaType.Charset.Value;
    }

    private static string[] GetContentEncodings(IHeaderDictionary headers)
    {
        if (!headers.TryGetValue(HeaderNames.ContentEncoding, out var values))
        {
            return [];
        }

        return values
            .SelectMany(value => value?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? [])
            .ToArray();
    }
}
