#nullable enable

using System.Diagnostics;
using System.Net;
using System.Web;
using Yarp.ReverseProxy.Forwarder;

namespace LocalTest.Filters;

public sealed class EnvRouteProxy
{
    private static readonly HttpMessageInvoker HttpClient = new(
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

    private readonly IHttpForwarder _forwarder;
    private readonly ILogger<EnvRouteProxy> _logger;

    public EnvRouteProxy(IHttpForwarder forwarder, ILogger<EnvRouteProxy> logger)
    {
        _forwarder = forwarder;
        _logger = logger;
    }

    public async Task Proxy(HttpContext context, string targetHost)
    {
        var transformer = new EnvHttpTransformer(FrontendVersionOverride.FromRequest(context, _logger));

        var error = await _forwarder.SendAsync(
            context,
            targetHost,
            HttpClient,
            ForwarderRequestConfig.Empty,
            transformer
        );

        if (error != ForwarderError.None)
        {
            await HandleProxyError(context, error, targetHost);
        }
    }

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

        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.StatusCode = 502;
        context.Response.ContentType = "text/html; charset=utf-8";
        await context.Response.WriteAsync(GetServiceErrorPage(targetHost));
    }

    private static string GetServiceErrorPage(string targetHost)
    {
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

    private sealed class EnvHttpTransformer : HttpTransformer
    {
        private readonly FrontendVersionOverride? _frontendVersionOverride;

        public EnvHttpTransformer(FrontendVersionOverride? frontendVersionOverride)
        {
            _frontendVersionOverride = frontendVersionOverride;
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

            CookieDomainRewriter.Rewrite(httpContext.Response.Headers);

            if (_frontendVersionOverride?.ShouldRewrite(proxyResponse) == true)
            {
                var rewritten = await _frontendVersionOverride.RewriteResponse(
                    httpContext,
                    proxyResponse,
                    cancellationToken
                );
                if (rewritten)
                {
                    return false;
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
}
