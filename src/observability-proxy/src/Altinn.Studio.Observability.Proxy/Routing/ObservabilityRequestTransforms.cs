using Altinn.Studio.Observability.Proxy.Auth;
using Altinn.Studio.Observability.Proxy.Configuration;
using Yarp.ReverseProxy.Transforms;
using Yarp.ReverseProxy.Transforms.Builder;

namespace Altinn.Studio.Observability.Proxy.Routing;

/// <summary>What the proxy changes on a request before it forwards it.</summary>
internal static class ObservabilityRequestTransforms
{
    public const string SourceHeader = "X-Observability-Source";

    /// <summary>
    /// The request headers an OTLP write keeps: what OTLP/HTTP needs to carry a protobuf or JSON
    /// body, compressed or not. The proxy adds <see cref="SourceHeader"/> after filtering.
    ///
    /// Everything else a source sends is dropped, because the agents act on headers the source must
    /// not choose: the Victoria components select a tenant from <c>AccountID</c> and
    /// <c>ProjectID</c>, and VictoriaLogs reads <c>VL-Extra-Fields</c>, <c>VL-Stream-Fields</c>,
    /// <c>VL-Ignore-Fields</c> and more, each of which rewrites what is stored. W3C trace context
    /// is dropped too: nothing behind the proxy continues a trace from it.
    /// </summary>
    public static readonly IReadOnlySet<string> OtlpWriteHeaders = new HashSet<string>(
        ["Content-Type", "Content-Encoding", "Content-Length"],
        StringComparer.OrdinalIgnoreCase
    );

    public static void Apply(TransformBuilderContext transformContext)
    {
        ArgumentNullException.ThrowIfNull(transformContext);

        if (ObservabilityReverseProxyConfig.RouteGroupOf(transformContext.Route) == ObservabilityPaths.OtlpRouteGroup)
        {
            // X-Forwarded-* describe the client to a backend that makes no use of it.
            transformContext.UseDefaultForwarders = false;
            transformContext.AddRequestTransform(KeepOnlyOtlpWriteHeadersAndNoQuery);
        }

        transformContext.AddRequestTransform(ReplaceTokenWithSource);
    }

    /// <summary>
    /// Restricts an OTLP write to <see cref="OtlpWriteHeaders"/>, and drops its query string. The
    /// agents honor query arguments with the same effect as the headers, such as vmagent's
    /// <c>extra_label</c> and VictoriaLogs' <c>extra_fields</c>, and an OTLP/HTTP exporter sends none.
    /// </summary>
    private static ValueTask KeepOnlyOtlpWriteHeadersAndNoQuery(RequestTransformContext requestContext)
    {
        var proxyRequest = requestContext.ProxyRequest;
        foreach (var name in proxyRequest.Headers.Select(header => header.Key).ToList())
        {
            if (!OtlpWriteHeaders.Contains(name))
            {
                proxyRequest.Headers.Remove(name);
            }
        }

        if (proxyRequest.Content is { } content)
        {
            foreach (var name in content.Headers.Select(header => header.Key).ToList())
            {
                if (!OtlpWriteHeaders.Contains(name))
                {
                    content.Headers.Remove(name);
                }
            }
        }

        requestContext.Query.Collection.Clear();
        return ValueTask.CompletedTask;
    }

    /// <summary>
    /// No backend ever sees the token. What it may see instead is the identity the token
    /// authenticated, set here rather than copied, so a source cannot claim another's identity.
    /// </summary>
    private static ValueTask ReplaceTokenWithSource(RequestTransformContext requestContext)
    {
        var headers = requestContext.ProxyRequest.Headers;
        headers.Remove("Authorization");
        headers.Remove(SourceHeader);

        var sourceIdentity = requestContext
            .HttpContext.Features.Get<ObservabilitySourceFeature>()
            ?.Source.SourceIdentity;
        if (!string.IsNullOrWhiteSpace(sourceIdentity))
        {
            headers.TryAddWithoutValidation(SourceHeader, sourceIdentity);
        }

        return ValueTask.CompletedTask;
    }
}
