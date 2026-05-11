#nullable enable

using System.Web;
using Altinn.Studio.HostBridge;
using LocalTest.HostBridge;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Net.Http.Headers;

namespace LocalTest.Filters;

public sealed class HostRouteProxy
{
    private const string AppComponent = "app";

    private readonly HostBridgeClient _hostBridgeClient;
    private readonly ILogger<HostRouteProxy> _logger;

    public HostRouteProxy(HostBridgeClient hostBridgeClient, ILogger<HostRouteProxy> logger)
    {
        _hostBridgeClient = hostBridgeClient;
        _logger = logger;
    }

    public async Task Proxy(HttpContext context, string target, int targetPort, string description)
    {
        try
        {
            if (string.Equals(description, AppComponent, StringComparison.OrdinalIgnoreCase))
            {
                await ProxyAppResponse(context, target, targetPort);
                return;
            }

            await ProxyRequest(context, target, targetPort);
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
        {
            await HandleProxyError(context, ex, description);
        }
    }

    private async Task ProxyAppResponse(HttpContext context, string target, int targetPort)
    {
        var frontendVersionOverride = FrontendVersionOverride.FromRequest(context, _logger);
        if (frontendVersionOverride == null)
        {
            context.Response.OnStarting(() =>
            {
                CookieDomainRewriter.Rewrite(context.Response.Headers);
                return Task.CompletedTask;
            });
            await ProxyRequest(context, target, targetPort);
            return;
        }

        var originalBody = context.Response.Body;
        await using var bufferedBody = new MemoryStream();
        context.Response.Body = bufferedBody;

        try
        {
            await ProxyRequest(context, target, targetPort);
        }
        finally
        {
            context.Response.Body = originalBody;
        }

        CookieDomainRewriter.Rewrite(context.Response.Headers);

        bufferedBody.Position = 0;
        var rewritten = await frontendVersionOverride.RewriteBufferedResponse(
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

    private async Task ProxyRequest(HttpContext context, string target, int targetPort)
    {
        using var request = CreateRequest(context);
        await _hostBridgeClient.ProxyToTarget(request, target, targetPort, context, context.RequestAborted);
    }

    private static HttpRequestMessage CreateRequest(HttpContext context)
    {
        if (RequestRequiresUpgrade(context.Request))
            throw new InvalidOperationException("upgrade requests are not supported by the host bridge");

        var request = new HttpRequestMessage(
            new HttpMethod(context.Request.Method),
            context.Request.PathBase + context.Request.Path + context.Request.QueryString
        );

        if (RequestHasDeclaredBody(context.Request))
            request.Content = new StreamContent(context.Request.Body);

        CopyHeaders(context.Request, request);
        ApplyForwardedHeaders(context, request);
        NormalizeBodyHeaders(request);

        return request;
    }

    private static void CopyHeaders(HttpRequest source, HttpRequestMessage target)
    {
        foreach (var header in source.Headers)
        {
            if (string.Equals(header.Key, HeaderNames.Host, StringComparison.OrdinalIgnoreCase))
            {
                target.Headers.Host = header.Value;
                continue;
            }

            if (HostBridgeHttpHeaders.ShouldSkipRequestHeader(header.Key))
                continue;

            if (HostBridgeHttpHeaders.IsContentHeader(header.Key))
            {
                if (target.Content is not null)
                    target.Content.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            }
            else
            {
                target.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            }
        }
    }

    private static void ApplyForwardedHeaders(HttpContext context, HttpRequestMessage request)
    {
        SetRequestHeader(request, "X-Forwarded-Host", context.Request.Host.Value);
        SetRequestHeader(request, "X-Forwarded-Proto", context.Request.Scheme);
        SetForwardedForHeader(request, context.Connection.RemoteIpAddress?.ToString());

        if (GetForwardedPort(context.Request) is { } port)
            SetRequestHeader(request, "X-Forwarded-Port", port);
    }

    private static void NormalizeBodyHeaders(HttpRequestMessage request)
    {
        if (
            request.Content is not null
            && request.Headers.TransferEncodingChunked == true
            && request.Content.Headers.ContentLength is not null
        )
        {
            request.Content.Headers.ContentLength = null;
        }
    }

    private static void SetRequestHeader(HttpRequestMessage request, string name, string value)
    {
        request.Headers.Remove(name);
        request.Headers.TryAddWithoutValidation(name, value);
    }

    private static void SetForwardedForHeader(HttpRequestMessage request, string? remoteIpAddress)
    {
        if (string.IsNullOrWhiteSpace(remoteIpAddress))
            return;

        var forwardedFor = remoteIpAddress;
        if (request.Headers.TryGetValues("X-Forwarded-For", out var existingValues))
        {
            var existing = string.Join(", ", existingValues.Where(value => !string.IsNullOrWhiteSpace(value)));
            if (existing.Length > 0)
                forwardedFor = $"{existing}, {remoteIpAddress}";
        }

        SetRequestHeader(request, "X-Forwarded-For", forwardedFor);
    }

    private static string? GetForwardedPort(HttpRequest request)
    {
        if (request.Host.Port is { } port)
            return port.ToString();

        return request.Scheme switch
        {
            "http" => "80",
            "https" => "443",
            _ => null,
        };
    }

    private async Task HandleProxyError(HttpContext context, Exception exception, string targetDescription)
    {
        _logger.LogWarning(exception, "Host route proxy failed for {TargetDescription}", targetDescription);

        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = 502;
        context.Response.ContentType = "text/html; charset=utf-8";
        if (string.Equals(targetDescription, AppComponent, StringComparison.OrdinalIgnoreCase))
        {
            await context.Response.WriteAsync(GetAppErrorPage(targetDescription));
            return;
        }

        await context.Response.WriteAsync(GetServiceErrorPage(targetDescription));
    }

    private static string GetAppErrorPage(string appId)
    {
        return $$"""
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
                <p>Could not proxy requests for {{HttpUtility.HtmlEncode(appId)}}</p>
                <p>Please ensure your Altinn app is running. Start it with:</p>
                <pre>dotnet run --project App/App.csproj</pre>
                <p>Or use studioctl:</p>
                <pre>studioctl run</pre>
            </body>
            </html>
            """;
    }

    private static string GetServiceErrorPage(string service)
    {
        return $$"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Host service unavailable</title>
                <style>
                    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                    h1 { color: #c00; }
                </style>
            </head>
            <body>
                <h1>502 Bad Gateway</h1>
                <h2>Host service unavailable</h2>
                <p>Could not proxy requests for {{HttpUtility.HtmlEncode(service)}} through the host bridge.</p>
            </body>
            </html>
            """;
    }

    private static bool RequestHasDeclaredBody(HttpRequest request) =>
        request.ContentLength is not null
        || request.Headers.ContainsKey(HeaderNames.TransferEncoding)
        || request.HttpContext.Features.Get<IHttpRequestBodyDetectionFeature>()?.CanHaveBody == true;

    private static bool RequestRequiresUpgrade(HttpRequest request) =>
        request.Headers.ContainsKey(HeaderNames.Upgrade)
        || request.Headers.TryGetValue(HeaderNames.Connection, out var connection)
            && connection.Any(value => value?.Contains("upgrade", StringComparison.OrdinalIgnoreCase) == true);
}
