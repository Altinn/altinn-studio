#nullable enable
using System.Diagnostics;
using System.IO.Compression;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using LocalTest.Configuration;
using LocalTest.Tunnel;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using Yarp.ReverseProxy.Forwarder;
using Yarp.ReverseProxy.Transforms;

namespace LocalTest.Filters;

public class ProxyMiddleware
{
    private readonly RequestDelegate _nextMiddleware;
    private readonly LocalPlatformSettings _settings;
    private readonly IHttpForwarder _forwarder;
    private readonly ILogger<ProxyMiddleware> _logger;
    private readonly AppTunnelProxy _appTunnelProxy;

    // Cookie name for frontend version override (URL-encoded URL)
    private const string FrontendVersionCookie = "frontendVersion";
    private const string PdfServiceHost = "pdf.local.altinn.cloud";
    private const string PgAdminHost = "pgadmin.local.altinn.cloud";
    private const string WorkflowEngineHost = "workflow-engine.local.altinn.cloud";
    private const string FrontendHost = "app-frontend.local.altinn.cloud";

    public ProxyMiddleware(
        RequestDelegate nextMiddleware,
        IOptions<LocalPlatformSettings> localPlatformSettings,
        IHttpForwarder forwarder,
        ILogger<ProxyMiddleware> logger,
        AppTunnelProxy appTunnelProxy
    )
    {
        _nextMiddleware = nextMiddleware;
        _settings = localPlatformSettings.Value;
        _forwarder = forwarder;
        _logger = logger;
        _appTunnelProxy = appTunnelProxy;
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
        "/internal/",
    ];

    public async Task Invoke(HttpContext context)
    {
        var path = context.Request.Path.Value;
        if (path == null)
        {
            await _nextMiddleware(context);
            return;
        }

        if (await TryProxyToHostService(context))
        {
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

        var appId = ExtractAppIdFromPath(path);
        if (appId != null && _appTunnelProxy.IsConnected)
        {
            try
            {
                await ProxyTunneledRequest(context, appId);
                return;
            }
            catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
            {
                await HandleTunnelProxyError(context, ex, appId);
                return;
            }
        }

        if (_appTunnelProxy.IsConnected)
        {
            try
            {
                await ProxyTunneledRequest(context, appId: null);
                return;
            }
            catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
            {
                if (!CanFallbackToLocalAppUrl(context))
                    throw;

                context.Response.Clear();
                _logger.LogDebug(ex, "Tunnel proxy failed for default app, falling back to LocalAppUrl");
            }
        }

        if (!string.IsNullOrEmpty(_settings.LocalAppUrl))
        {
            await ProxyRequest(context, _settings.LocalAppUrl);
            return;
        }

        // If we get here, no proxy target available
        await _nextMiddleware(context);
    }

    private async Task<bool> TryProxyToHostService(HttpContext context)
    {
        var host = context.Request.Host.Host;
        if (string.IsNullOrWhiteSpace(host))
        {
            return false;
        }

        if (IsHost(host, WorkflowEngineHost))
        {
            return await TryProxyToConfiguredService(context, _settings.LocalWorkflowEngineUrl);
        }

        if (IsHost(host, FrontendHost))
        {
            await ProxyTunnelTarget(
                context,
                Altinn.Studio.AppTunnel.TunnelDefaults.FrontendDevServerTarget,
                Altinn.Studio.AppTunnel.TunnelDefaults.FrontendDevServerPort,
                $"frontend dev server on port {Altinn.Studio.AppTunnel.TunnelDefaults.FrontendDevServerPort}"
            );
            return true;
        }

        if (IsHost(host, PdfServiceHost))
        {
            return await TryProxyToConfiguredService(context, _settings.LocalPdfServiceUrl);
        }

        if (IsHost(host, PgAdminHost))
        {
            return await TryProxyToConfiguredService(context, _settings.LocalPgAdminUrl);
        }

        return false;
    }

    private async Task<bool> TryProxyToExternalService(HttpContext context, string path)
    {
        if (path.StartsWith("/grafana/", StringComparison.OrdinalIgnoreCase) || path == "/grafana")
        {
            return await TryProxyToConfiguredService(context, _settings.LocalGrafanaUrl);
        }

        return false;
    }

    private async Task<bool> TryProxyToConfiguredService(HttpContext context, string? targetUrl)
    {
        if (string.IsNullOrEmpty(targetUrl))
        {
            return false;
        }

        await ProxyRequest(context, targetUrl);
        return true;
    }

    private static bool IsHost(string host, string expected) =>
        string.Equals(host, expected, StringComparison.OrdinalIgnoreCase);

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

    private static bool CanFallbackToLocalAppUrl(HttpContext context) =>
        !context.Response.HasStarted && !RequestMayHaveBody(context.Request);

    private static bool RequestMayHaveBody(HttpRequest request) =>
        request.ContentLength is > 0 || request.Headers.ContainsKey(HeaderNames.TransferEncoding);

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
            ConnectTimeout = TimeSpan.FromSeconds(5),
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

    private async Task ProxyTunneledRequest(HttpContext context, string? appId)
    {
        var frontendVersionUrl = GetFrontendVersionUrl(context);
        if (frontendVersionUrl == null)
        {
            context.Response.OnStarting(() =>
            {
                LocaltestResponseTransformer.RewriteCookieDomains(context.Response.Headers);
                return Task.CompletedTask;
            });
            await _appTunnelProxy.ProxyAsync(context, appId, context.RequestAborted);
            return;
        }

        await ProxyTunneledRequestWithBufferedResponse(context, appId, frontendVersionUrl);
    }

    private async Task ProxyTunnelTarget(
        HttpContext context,
        string target,
        int targetPort,
        string description
    )
    {
        try
        {
            await _appTunnelProxy.ProxyToTargetAsync(context, target, targetPort, context.RequestAborted);
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
        {
            await HandleTunnelProxyError(context, ex, description);
        }
    }

    private async Task ProxyTunneledRequestWithBufferedResponse(
        HttpContext context,
        string? appId,
        string frontendVersionUrl
    )
    {
        var originalBody = context.Response.Body;
        await using var bufferedBody = new MemoryStream();
        context.Response.Body = bufferedBody;

        try
        {
            await _appTunnelProxy.ProxyAsync(context, appId, context.RequestAborted);
        }
        finally
        {
            context.Response.Body = originalBody;
        }

        LocaltestResponseTransformer.RewriteCookieDomains(context.Response.Headers);

        bufferedBody.Position = 0;
        var transformer = new LocaltestResponseTransformer(frontendVersionUrl, _logger);
        var rewritten = await transformer.RewriteBufferedFrontendResources(
            context,
            bufferedBody,
            context.RequestAborted
        );
        if (rewritten)
        {
            return;
        }

        bufferedBody.Position = 0;
        await bufferedBody.CopyToAsync(originalBody, context.RequestAborted);
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

    private async Task HandleTunnelProxyError(HttpContext context, Exception exception, string targetDescription)
    {
        _logger.LogWarning(exception, "Tunnel proxy failed for {TargetDescription}", targetDescription);

        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = 502;
        context.Response.ContentType = "text/html; charset=utf-8";

        await context.Response.WriteAsync(GetErrorPage($"app tunnel for {targetDescription}"));
    }

    /// <summary>
    /// Generate a friendly 502 error page.
    /// </summary>
    private static string GetErrorPage(string targetHost)
    {
        var isAppTarget = targetHost.Contains(":5005");

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
    private readonly LocaltestResponseTransformer _responseTransformer;

    public LocaltestHttpTransformer(string? frontendVersionUrl, ILogger logger)
    {
        _responseTransformer = new LocaltestResponseTransformer(frontendVersionUrl, logger);
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

        // Match the legacy nginx load balancer by preserving the browser-visible host header
        // for all proxied requests, even when the upstream target is container-only.
        proxyRequest.Headers.Host = httpContext.Request.Host.Value;
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
        LocaltestResponseTransformer.RewriteCookieDomains(httpContext.Response.Headers);

        // Check if we need to modify the response body for frontend version substitution
        if (_responseTransformer.ShouldRewriteFrontendResources(proxyResponse))
        {
            var rewritten = await _responseTransformer.RewriteFrontendResources(
                httpContext,
                proxyResponse,
                cancellationToken
            );
            if (rewritten)
            {
                return false; // We've handled the body, don't let YARP copy it again
            }
        }

        return result;
    }

    public override async ValueTask TransformResponseTrailersAsync(
        HttpContext httpContext,
        HttpResponseMessage proxyResponse,
        CancellationToken cancellationToken
    )
    {
        await base.TransformResponseTrailersAsync(httpContext, proxyResponse, cancellationToken);
    }
}

internal sealed class LocaltestResponseTransformer
{
    private readonly string? _frontendVersionUrl;
    private readonly ILogger _logger;

    private const string OldCookieDomain = "altinn3local.no";
    private const string NewCookieDomain = "local.altinn.cloud";

    // Regex to match altinn-app-frontend resources.
    private static readonly Regex FrontendResourceRegex = new(
        @"(https?://[^""'\s]*/)(altinn-app-frontend\.(js|css))",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    public LocaltestResponseTransformer(string? frontendVersionUrl, ILogger logger)
    {
        _frontendVersionUrl = frontendVersionUrl;
        _logger = logger;
    }

    public bool ShouldRewriteFrontendResources(HttpResponseMessage proxyResponse)
    {
        return _frontendVersionUrl != null && IsHtmlResponse(proxyResponse.Content?.Headers?.ContentType?.MediaType);
    }

    public async Task<bool> RewriteBufferedFrontendResources(
        HttpContext httpContext,
        Stream body,
        CancellationToken cancellationToken
    )
    {
        if (_frontendVersionUrl == null || !IsHtmlResponse(httpContext.Response.ContentType))
        {
            return false;
        }

        var contentEncodings = GetContentEncodings(httpContext.Response.Headers);
        var charset = GetCharset(httpContext.Response.ContentType);
        return await RewriteFrontendResources(
            httpContext,
            body,
            contentEncodings,
            charset,
            cancellationToken
        );
    }

    private static bool IsHtmlResponse(string? mediaType)
    {
        if (string.IsNullOrWhiteSpace(mediaType))
        {
            return false;
        }

        return mediaType.StartsWith("text/html", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Rewrite frontend resource URLs in HTML response.
    /// Replaces altinn-app-frontend.js/css URLs with the frontendVersion URL.
    /// </summary>
    public async Task<bool> RewriteFrontendResources(
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
        return await RewriteFrontendResources(
            httpContext,
            contentStream,
            proxyResponse.Content.Headers.ContentEncoding,
            proxyResponse.Content.Headers.ContentType?.CharSet,
            cancellationToken
        );
    }

    private async Task<bool> RewriteFrontendResources(
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
            match => _frontendVersionUrl + match.Groups[2].Value
        );

        if (modifiedContent != originalContent)
        {
            _logger.LogDebug(
                "Rewrote frontend resources to use version URL: {FrontendVersionUrl}",
                _frontendVersionUrl
            );
        }

        httpContext.Response.Headers.Remove(HeaderNames.ContentEncoding);

        var bytes = Encoding.UTF8.GetBytes(modifiedContent);
        httpContext.Response.ContentLength = bytes.Length;
        await httpContext.Response.Body.WriteAsync(bytes, cancellationToken);
        return true;
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

    /// <summary>
    /// Rewrite Set-Cookie headers to replace old domain with new domain.
    /// </summary>
    public static void RewriteCookieDomains(IHeaderDictionary headers)
    {
        if (!headers.TryGetValue(HeaderNames.SetCookie, out var cookies))
        {
            return;
        }

        headers[HeaderNames.SetCookie] = cookies
            .Select(cookie =>
                cookie?.Replace(
                    $"domain={OldCookieDomain}",
                    $"domain={NewCookieDomain}",
                    StringComparison.OrdinalIgnoreCase
                ) ?? string.Empty
            )
            .ToArray();
    }
}
