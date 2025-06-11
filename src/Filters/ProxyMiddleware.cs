#nullable enable
using System.Diagnostics;
using System.Net;
using System.Text.RegularExpressions;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;
using Yarp.ReverseProxy.Forwarder;

namespace LocalTest.Filters;

public class ProxyMiddleware
{
    private readonly RequestDelegate _nextMiddleware;
    private readonly IOptions<LocalPlatformSettings> localPlatformSettings;
    private readonly IHttpForwarder _forwarder;

    public ProxyMiddleware(
        RequestDelegate nextMiddleware,
        IOptions<LocalPlatformSettings> localPlatformSettings,
        IHttpForwarder forwarder
    )
    {
        _nextMiddleware = nextMiddleware;
        this.localPlatformSettings = localPlatformSettings;
        _forwarder = forwarder;
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
        // TODO: only proxy requests to the actually running app
        foreach (var noProxy in _noProxies)
        {
            if (noProxy.IsMatch(path))
            {
                await _nextMiddleware(context);
                return;
            }
        }
        await ProxyRequest(context, localPlatformSettings.Value.LocalAppUrl);
        return;
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
