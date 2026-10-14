using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Text.Json;
using Altinn.Studio.Observability.Proxy.Auth;
using Altinn.Studio.Observability.Proxy.Configuration;
using Altinn.Studio.Observability.Proxy.Routing;
using Microsoft.AspNetCore.Http.Features;
using Yarp.ReverseProxy.Configuration;
using Yarp.ReverseProxy.Forwarder;
using Yarp.ReverseProxy.Model;

namespace Altinn.Studio.Observability.Proxy.Telemetry;

/// <summary>
/// The proxy's own metrics, and the attributes it adds to ASP.NET Core's
/// <c>http.server.request.duration</c>.
///
/// Every attribute value is bounded: a source identity comes from the accepted-token list, a
/// destination from the configuration, and the rest from fixed sets. No token, nor anything
/// derived from one, is ever an attribute value; the token slot is the token's position in its
/// identity's list, not the token.
/// </summary>
internal sealed class ObservabilityProxyMetrics
{
    public const string MeterName = "Altinn.Studio.Observability.Proxy";

    /// <summary>
    /// The library meters exported beside <see cref="MeterName"/>: requests served, Kestrel's
    /// connections, the forwarder's requests to each backend (<c>http.client.*</c>, by
    /// <c>server.address</c>), and the .NET runtime.
    /// </summary>
    public static readonly IReadOnlyList<string> LibraryMeterNames =
    [
        "Microsoft.AspNetCore.Hosting",
        "Microsoft.AspNetCore.Server.Kestrel",
        "System.Net.Http",
        "System.Runtime",
    ];

    public const string IngestDirection = "ingest";

    public const string QueryDirection = "query";

    public const string MissingToken = "missing_token";

    public const string UnknownToken = "unknown_token";

    private readonly Counter<long> _authenticationFailures;
    private readonly Counter<long> _rateLimitRejections;
    private readonly Counter<long> _forwardingErrors;
    private readonly Counter<long> _failovers;

    public ObservabilityProxyMetrics(IMeterFactory meterFactory)
    {
        ArgumentNullException.ThrowIfNull(meterFactory);

        Meter = meterFactory.Create(MeterName);
        _authenticationFailures = Meter.CreateCounter<long>(
            "altinn.observability_proxy.authentication.failures",
            "{request}",
            "Requests refused because they carried no bearer token or one the proxy does not accept."
        );
        _rateLimitRejections = Meter.CreateCounter<long>(
            "altinn.observability_proxy.rate_limit.rejections",
            "{request}",
            "Requests refused by the per-identity rate limit."
        );
        _forwardingErrors = Meter.CreateCounter<long>(
            "altinn.observability_proxy.forwarding.errors",
            "{request}",
            "Requests the proxy could not forward to a backend, or not completely."
        );
        _failovers = Meter.CreateCounter<long>(
            "altinn.observability_proxy.read.failovers",
            "{failover}",
            "Moves of a signal's reads from one storage copy to the other."
        );
    }

    public Meter Meter { get; }

    /// <summary>Adds the route's signal and direction to the request's <c>http.server.*</c> metrics.</summary>
    public static void TagRoute(HttpContext context, RouteConfig? route)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (context.Features.Get<IHttpMetricsTagsFeature>() is not { } metricsTags)
        {
            return;
        }

        foreach (var tag in RouteTags(route))
        {
            metricsTags.Tags.Add(tag);
        }
    }

    /// <summary>Adds the authenticated source to the request's <c>http.server.*</c> metrics.</summary>
    public static void TagSource(HttpContext context, ObservabilitySource source)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(source);

        if (context.Features.Get<IHttpMetricsTagsFeature>() is not { } metricsTags)
        {
            return;
        }

        metricsTags.Tags.Add(new(Attributes.SourceIdentity, source.SourceIdentity));
        metricsTags.Tags.Add(new(Attributes.TokenSlot, SlotName(source.TokenSlot)));
    }

    /// <param name="errorType"><see cref="MissingToken"/> or <see cref="UnknownToken"/>.</param>
    public void RecordAuthenticationFailure(RouteConfig? route, string errorType)
    {
        var tags = new TagList { { Attributes.ErrorType, errorType } };
        foreach (var tag in RouteTags(route))
        {
            tags.Add(tag);
        }

        _authenticationFailures.Add(1, tags);
    }

    public void RecordRateLimitRejection(HttpContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tags = new TagList();
        var route = context.GetEndpoint()?.Metadata.GetMetadata<RouteModel>()?.Config;
        foreach (var tag in RouteTags(route))
        {
            tags.Add(tag);
        }

        if (context.Features.Get<ObservabilitySourceFeature>() is { } sourceFeature)
        {
            tags.Add(Attributes.SourceIdentity, sourceFeature.Source.SourceIdentity);
        }

        _rateLimitRejections.Add(1, tags);
    }

    /// <param name="destinationId">The destination the request was sent to, or <c>null</c> when none was available.</param>
    public void RecordForwardingError(RouteConfig route, string? destinationId, ForwarderError error)
    {
        var tags = new TagList
        {
            { Attributes.ErrorType, JsonNamingPolicy.SnakeCaseLower.ConvertName(error.ToString()) },
        };
        foreach (var tag in RouteTags(route))
        {
            tags.Add(tag);
        }

        if (destinationId is not null)
        {
            tags.Add(Attributes.Destination, destinationId);
        }

        _forwardingErrors.Add(1, tags);
    }

    /// <param name="signal">The signal whose storage pair failed over, which is also its read cluster's ID.</param>
    /// <param name="destinationId">The copy reads moved to.</param>
    public void RecordFailover(string signal, string destinationId)
    {
        _failovers.Add(
            1,
            new KeyValuePair<string, object?>(Attributes.Signal, signal),
            new KeyValuePair<string, object?>(Attributes.Destination, destinationId)
        );
    }

    public static string SlotName(TokenSlot slot) => slot == TokenSlot.Current ? "current" : "previous";

    private static IEnumerable<KeyValuePair<string, object?>> RouteTags(RouteConfig? route)
    {
        if (ObservabilityReverseProxyConfig.SignalOf(route) is not { } signal)
        {
            yield break;
        }

        yield return new(Attributes.Signal, signal.Name);
        yield return new(
            Attributes.Direction,
            ObservabilityReverseProxyConfig.RouteGroupOf(route) == ObservabilityPaths.OtlpRouteGroup
                ? IngestDirection
                : QueryDirection
        );
    }

    /// <summary>
    /// Attribute names. The proxy's own are under <c>altinn.observability_proxy.</c>, as
    /// https://github.com/Altinn/altinn-studio/issues/21073 names a service's own telemetry.
    /// </summary>
    internal static class Attributes
    {
        /// <summary>The identity the request's token belongs to, such as <c>studio-prod</c> or <c>grafana</c>.</summary>
        public const string SourceIdentity = "altinn.observability_proxy.source_identity";

        /// <summary><c>current</c> or <c>previous</c>: which of the identity's accepted tokens was presented.</summary>
        public const string TokenSlot = "altinn.observability_proxy.token_slot";

        /// <summary><c>metrics</c>, <c>logs</c> or <c>traces</c>.</summary>
        public const string Signal = "altinn.observability_proxy.signal";

        /// <summary><c>ingest</c> for an OTLP write, <c>query</c> for a read.</summary>
        public const string Direction = "altinn.observability_proxy.direction";

        /// <summary><c>agent</c> for a write; <c>a</c> or <c>b</c>, the storage copy, for a read.</summary>
        public const string Destination = "altinn.observability_proxy.destination";

        public const string ErrorType = "error.type";
    }
}
