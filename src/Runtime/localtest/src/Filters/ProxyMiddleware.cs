#nullable enable
using System.Diagnostics;
using System.Net;
using System.Text.RegularExpressions;
using LocalTest.Configuration;
using LocalTest.Services.AppRegistry;
using Microsoft.Extensions.Options;
using Yarp.ReverseProxy.Forwarder;

namespace LocalTest.Filters;

public class ProxyMiddleware
{
    private readonly RequestDelegate _nextMiddleware;
    private readonly IOptions<LocalPlatformSettings> localPlatformSettings;
    private readonly IHttpForwarder _forwarder;
    private readonly AppRegistryService? _appRegistryService;
    private readonly ILogger<ProxyMiddleware> _logger;

    public ProxyMiddleware(
        RequestDelegate nextMiddleware,
        IOptions<LocalPlatformSettings> localPlatformSettings,
        IHttpForwarder forwarder,
        ILogger<ProxyMiddleware> logger,
        AppRegistryService? appRegistryService = null
    )
    {
        _nextMiddleware = nextMiddleware;
        this.localPlatformSettings = localPlatformSettings;
        _forwarder = forwarder;
        _logger = logger;
        _appRegistryService = appRegistryService;
    }

    private static readonly List<Regex> _noProxies =
        new()
        {
            new Regex("^/$"),
            new Regex("^/Home/"),
            new Regex("^/localtestresources/"),
            new Regex("^/LocalPlatformStorage/"),
            new Regex("^/accessmanagement/"),
            new Regex("^/authentication/"),
            new Regex("^/authorization/"),
            new Regex("^/profile/"),
            new Regex("^/events/"),
            new Regex("^/register/"),
            new Regex("^/storage/"),
        };

    public async Task Invoke(HttpContext context)
    {
        var path = context.Request.Path.Value;
        if (path == null)
        {
            await _nextMiddleware(context);
            return;
        }

        // Check if path should not be proxied
        foreach (var noProxy in _noProxies)
        {
            if (noProxy.IsMatch(path))
            {
                await _nextMiddleware(context);
                return;
            }
        }

        // In auto mode, extract appId and route to registered app
        if (_appRegistryService != null)
        {
            var appId = ExtractAppIdFromPath(path);
            if (appId != null)
            {
                var registration = _appRegistryService.GetRegistration(appId);
                if (registration != null)
                {
                    var targetUrl = $"http://{registration.Hostname}:{registration.Port}";
                    _logger.LogDebug("Proxying request for {AppId} to {TargetUrl}", appId, targetUrl);
                    await ProxyRequest(context, targetUrl);
                    return;
                }
                else
                {
                    _logger.LogWarning("App {AppId} not registered, cannot proxy request", appId);
                    context.Response.StatusCode = 404;
                    await context.Response.WriteAsJsonAsync(new { error = $"App {appId} is not registered" });
                    return;
                }
            }

            // In auto mode, if path doesn't match an app pattern, don't proxy - let next middleware handle it
            await _nextMiddleware(context);
            return;
        }

        // Fallback to LocalAppUrl for backward compatibility (only in http mode, when not in auto mode)
        if (!string.IsNullOrEmpty(localPlatformSettings.Value.LocalAppUrl))
        {
            await ProxyRequest(context, localPlatformSettings.Value.LocalAppUrl);
            return;
        }

        // If we get here, no proxy target available
        await _nextMiddleware(context);
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

    public static HttpMessageInvoker _httpClient = new HttpMessageInvoker(
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

    public async Task ProxyRequest(HttpContext context, string newHost)
    {
        var error = await _forwarder.SendAsync(context, newHost, _httpClient);
        // Check if the operation was successful
        if (error != ForwarderError.None)
        {
            var errorFeature = context.GetForwarderErrorFeature();
            throw errorFeature?.Exception ?? new Exception("Forwarder error");
        }
    }
}
