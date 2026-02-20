#nullable enable
using System.Diagnostics;
using System.IO.Compression;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using LocalTest.Configuration;
using LocalTest.Services.AppRegistry;
using Microsoft.Extensions.Options;
using Yarp.ReverseProxy.Forwarder;
using Yarp.ReverseProxy.Transforms;

namespace LocalTest.Filters;

public class ProxyMiddleware
{
    private readonly RequestDelegate _nextMiddleware;
    private readonly LocalPlatformSettings _settings;
    private readonly IHttpForwarder _forwarder;
    private readonly AppRegistryService _appRegistryService;
    private readonly ILogger<ProxyMiddleware> _logger;

    // Cookie name for frontend version override (URL-encoded URL)
    private const string FrontendVersionCookie = "frontendVersion";

    public ProxyMiddleware(
        RequestDelegate nextMiddleware,
        IOptions<LocalPlatformSettings> localPlatformSettings,
        IHttpForwarder forwarder,
        ILogger<ProxyMiddleware> logger,
        AppRegistryService appRegistryService
    )
    {
        _nextMiddleware = nextMiddleware;
        _settings = localPlatformSettings.Value;
        _forwarder = forwarder;
        _logger = logger;
        _appRegistryService = appRegistryService;
    }

    // Path prefixes handled directly by localtest (not proxied to apps)
    private static readonly string[] _localtestPathPrefixes =
    [
        "/Home/",
        "/_framework/",
        "/localtestresources/",
        "/LocalPlatformStorage/",
        "/accessmanagement/",
        "/authentication/",
        "/authorization/",
        "/profile/",
        "/events/",
        "/register/",
        "/storage/",
        "/notifications/",
        "/health",
    ];

    public async Task Invoke(HttpContext context)
    {
        var path = context.Request.Path.Value;
        if (path == null)
        {
            await _nextMiddleware(context);
            return;
        }

        if (await TryProxyToExternalService(context, path))
        {
            return;
        }

        if (IsLocaltestPath(path))
        {
            await _nextMiddleware(context);
            return;
        }

        // Try to route to registered app first
        var appId = ExtractAppIdFromPath(path);
        if (appId != null)
        {
            var targetUrl = _appRegistryService.GetUrl(appId);
            if (targetUrl != null)
            {
                _logger.LogDebug("Proxying request for registered app {AppId} to {TargetUrl}", appId, targetUrl);
                await ProxyRequest(context, targetUrl);
                return;
            }
        }

        // App not registered - fallback to LocalAppUrl (port 5005)
        if (!string.IsNullOrEmpty(_settings.LocalAppUrl))
        {
            await ProxyRequest(context, _settings.LocalAppUrl);
            return;
        }

        // If we get here, no proxy target available
        await _nextMiddleware(context);
    }

    private async Task<bool> TryProxyToExternalService(HttpContext context, string path)
    {
        if (path.StartsWith("/pdfservice/", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrEmpty(_settings.LocalPdfServiceUrl))
            {
                context.Request.Path = path["/pdfservice".Length..];
                await ProxyRequest(context, _settings.LocalPdfServiceUrl);
                return true;
            }
            return false;
        }

        if (path.StartsWith("/grafana/", StringComparison.OrdinalIgnoreCase) || path == "/grafana")
        {
            if (!string.IsNullOrEmpty(_settings.LocalGrafanaUrl))
            {
                await ProxyRequest(context, _settings.LocalGrafanaUrl);
                return true;
            }
            return false;
        }

        if (path.StartsWith("/receipt/", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrEmpty(_settings.LocalReceiptUrl))
            {
                await ProxyRequest(context, _settings.LocalReceiptUrl);
                return true;
            }
            return false;
        }

        return false;
    }

    private static bool IsLocaltestPath(string path)
    {
        if (path == "/")
        {
            return true;
        }

        foreach (var prefix in _localtestPathPrefixes)
        {
            if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Extract appId (org/app) from URL path
    /// Expects path format: /org/app/...
    /// </summary>
    private static string? ExtractAppIdFromPath(string path)
    {
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length >= 2)
        {
            return $"{segments[0]}/{segments[1]}";
        }
        return null;
    }

    private static readonly HttpMessageInvoker _httpClient = new(
        new SocketsHttpHandler
        {
            UseProxy = false,
            AllowAutoRedirect = false,
            AutomaticDecompression = DecompressionMethods.None,
            UseCookies = false,
            EnableMultipleHttp2Connections = true,
            ActivityHeadersPropagator = new ReverseProxyPropagator(
                DistributedContextPropagator.Current
            ),
            ConnectTimeout = TimeSpan.FromSeconds(15),
        }
    );

    private async Task ProxyRequest(HttpContext context, string targetHost)
    {
        var frontendVersionUrl = GetFrontendVersionUrl(context);

        var transformer = new LocaltestHttpTransformer(frontendVersionUrl, _logger);

        var error = await _forwarder.SendAsync(
            context,
            targetHost,
            _httpClient,
            ForwarderRequestConfig.Empty,
            transformer
        );

        if (error != ForwarderError.None)
        {
            await HandleProxyError(context, error, targetHost);
        }
    }

    /// <summary>
    /// Extract and decode the frontendVersion cookie value (URL-encoded URL).
    /// </summary>
    private static string? GetFrontendVersionUrl(HttpContext context)
    {
        if (!context.Request.Cookies.TryGetValue(FrontendVersionCookie, out var cookieValue))
        {
            return null;
        }

        if (string.IsNullOrEmpty(cookieValue))
        {
            return null;
        }

        try
        {
            return HttpUtility.UrlDecode(cookieValue);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Handle proxy errors with friendly error pages.
    /// </summary>
    private async Task HandleProxyError(HttpContext context, ForwarderError error, string targetHost)
    {
        var errorFeature = context.GetForwarderErrorFeature();
        var exception = errorFeature?.Exception;

        _logger.LogWarning(
            exception,
            "Proxy error {Error} forwarding to {TargetHost}",
            error,
            targetHost
        );

        // Don't modify response if already started
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.StatusCode = 502;
        context.Response.ContentType = "text/html; charset=utf-8";

        var errorPage = GetErrorPage(targetHost);
        await context.Response.WriteAsync(errorPage);
    }

    /// <summary>
    /// Generate a friendly 502 error page.
    /// </summary>
    private static string GetErrorPage(string targetHost)
    {
        var isAppTarget = targetHost.Contains(":5005") || targetHost.Contains("host.docker.internal");

        if (isAppTarget)
        {
            return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>App not running</title>
                    <style>
                        body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                        h1 { color: #c00; }
                        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <h1>502 Bad Gateway</h1>
                    <h2>Your local app is not running</h2>
                    <p>Please ensure your Altinn app is running. Start it with:</p>
                    <pre>dotnet run --project App/App.csproj</pre>
                    <p>Or use studioctl:</p>
                    <pre>studioctl run</pre>
                </body>
                </html>
                """;
        }

        return $$"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Service unavailable</title>
                <style>
                    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                    h1 { color: #c00; }
                </style>
            </head>
            <body>
                <h1>502 Bad Gateway</h1>
                <h2>Service unavailable</h2>
                <p>Could not connect to backend service at {{HttpUtility.HtmlEncode(targetHost)}}</p>
            </body>
            </html>
            """;
    }
}

/// <summary>
/// HTTP transformer for localtest proxy responses.
/// Handles cookie domain rewriting and response body modifications.
/// </summary>
internal sealed class LocaltestHttpTransformer : HttpTransformer
{
    private readonly string? _frontendVersionUrl;
    private readonly ILogger _logger;

    private const string OldCookieDomain = "altinn3local.no";
    private const string NewCookieDomain = "local.altinn.cloud";

    // Regex to match altinn-app-frontend resources
    private static readonly Regex FrontendResourceRegex = new(
        @"(https?://[^""'\s]*/)(altinn-app-frontend\.(js|css))",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    public LocaltestHttpTransformer(string? frontendVersionUrl, ILogger logger)
    {
        _frontendVersionUrl = frontendVersionUrl;
        _logger = logger;
    }

    public override async ValueTask TransformRequestAsync(
        HttpContext httpContext,
        HttpRequestMessage proxyRequest,
        string destinationPrefix,
        CancellationToken cancellationToken
    )
    {
        await HttpTransformer.Default.TransformRequestAsync(
            httpContext,
            proxyRequest,
            destinationPrefix,
            cancellationToken
        );
    }

    public override async ValueTask<bool> TransformResponseAsync(
        HttpContext httpContext,
        HttpResponseMessage? proxyResponse,
        CancellationToken cancellationToken
    )
    {
        var result = await base.TransformResponseAsync(httpContext, proxyResponse, cancellationToken);

        if (proxyResponse == null)
        {
            return result;
        }

        // Rewrite cookie domains in Set-Cookie headers
        RewriteCookieDomains(httpContext, proxyResponse);

        // Check if we need to modify the response body for frontend version substitution
        if (_frontendVersionUrl != null && IsHtmlResponse(proxyResponse))
        {
            var rewritten = await RewriteFrontendResources(httpContext, proxyResponse, cancellationToken);
            if (rewritten)
            {
                return false; // We've handled the body, don't let YARP copy it again
            }
        }

        return result;
    }

    /// <summary>
    /// Check if response is HTML that might need frontend resource rewriting.
    /// </summary>
    private static bool IsHtmlResponse(HttpResponseMessage proxyResponse)
    {
        var contentType = proxyResponse.Content?.Headers?.ContentType?.MediaType;
        return string.Equals(contentType, "text/html", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Rewrite frontend resource URLs in HTML response.
    /// Replaces altinn-app-frontend.js/css URLs with the frontendVersion URL.
    /// </summary>
    private async Task<bool> RewriteFrontendResources(
        HttpContext httpContext,
        HttpResponseMessage proxyResponse,
        CancellationToken cancellationToken
    )
    {
        if (proxyResponse.Content == null)
        {
            return false;
        }

        var originalContent = await ReadResponseContentAsync(proxyResponse, cancellationToken);
        if (originalContent == null)
        {
            return false;
        }

        var modifiedContent = FrontendResourceRegex.Replace(
            originalContent,
            match => _frontendVersionUrl + match.Groups[2].Value
        );

        if (modifiedContent != originalContent)
        {
            _logger.LogDebug(
                "Rewrote frontend resources to use version URL: {FrontendVersionUrl}",
                _frontendVersionUrl
            );
        }

        httpContext.Response.Headers.Remove("Content-Encoding");

        var bytes = Encoding.UTF8.GetBytes(modifiedContent);
        httpContext.Response.ContentLength = bytes.Length;
        await httpContext.Response.Body.WriteAsync(bytes, cancellationToken);
        return true;
    }

    private async Task<string?> ReadResponseContentAsync(
        HttpResponseMessage proxyResponse,
        CancellationToken cancellationToken
    )
    {
        var content = proxyResponse.Content;
        if (content is null)
        {
            return null;
        }

        var contentStream = await content.ReadAsStreamAsync(cancellationToken);
        var decodedStream = CreateDecodingStream(contentStream, content.Headers.ContentEncoding);
        if (decodedStream is null)
        {
            await contentStream.DisposeAsync();
            _logger.LogWarning(
                "Skipping frontend rewrite due to unsupported content encoding: {ContentEncoding}",
                string.Join(", ", content.Headers.ContentEncoding)
            );
            return null;
        }

        using var decodedStreamScope = decodedStream;
        var encoding = GetContentEncoding(content.Headers.ContentType?.CharSet);
        using var reader = new StreamReader(decodedStreamScope, encoding, detectEncodingFromByteOrderMarks: true);
        return await reader.ReadToEndAsync();
    }

    private Stream? CreateDecodingStream(Stream contentStream, ICollection<string> contentEncodings)
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

    public override async ValueTask TransformResponseTrailersAsync(
        HttpContext httpContext,
        HttpResponseMessage proxyResponse,
        CancellationToken cancellationToken
    )
    {
        await base.TransformResponseTrailersAsync(httpContext, proxyResponse, cancellationToken);
    }

    /// <summary>
    /// Rewrite Set-Cookie headers to replace old domain with new domain.
    /// </summary>
    private void RewriteCookieDomains(HttpContext httpContext, HttpResponseMessage proxyResponse)
    {
        if (!proxyResponse.Headers.TryGetValues("Set-Cookie", out var cookies))
        {
            return;
        }

        httpContext.Response.Headers.Remove("Set-Cookie");

        foreach (var cookie in cookies)
        {
            var rewrittenCookie = cookie.Replace(
                $"domain={OldCookieDomain}",
                $"domain={NewCookieDomain}",
                StringComparison.OrdinalIgnoreCase
            );
            httpContext.Response.Headers.Append("Set-Cookie", rewrittenCookie);
        }
    }
}
