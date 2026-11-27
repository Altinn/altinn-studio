using Altinn.App.Api.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Microsoft.AspNetCore.Http.Features;
using Labels = Altinn.App.Core.Features.Telemetry.Labels;
using Tag = System.Collections.Generic.KeyValuePair<string, object?>;

namespace Altinn.App.Api.Infrastructure.Middleware;

internal sealed class TelemetryEnrichingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TelemetryEnrichingMiddleware> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="TelemetryEnrichingMiddleware"/> class.
    /// </summary>
    /// <param name="next">The next middleware in the pipeline.</param>
    /// <param name="logger">The logger instance.</param>
    public TelemetryEnrichingMiddleware(RequestDelegate next, ILogger<TelemetryEnrichingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// Invokes the middleware to process the HTTP context.
    /// </summary>
    /// <param name="context">The HTTP context.</param>
    public async Task InvokeAsync(HttpContext context)
    {
        if (ServiceCollectionExtensions.IsProbe(context.Request))
        {
            // Probes are not traffic: the trace instrumentation already leaves them out, and this keeps them out of
            // the request metrics.
            var probeMetrics = context.Features.Get<IHttpMetricsTagsFeature>();
            if (probeMetrics is not null)
            {
                probeMetrics.MetricsDisabled = true;
            }

            await _next(context);
            return;
        }

        var activity = context.Features.Get<IHttpActivityFeature>()?.Activity;

        if (activity is not null)
        {
            try
            {
                var authenticationContext = context.RequestServices.GetRequiredService<IAuthenticationContext>();
                var currentAuth = authenticationContext.Current;
                activity.SetAuthenticated(currentAuth);

                // Set telemetry tags with route values if available.
                if (
                    context.Request.RouteValues.TryGetValue("instanceOwnerPartyId", out var instanceOwnerPartyId)
                    && instanceOwnerPartyId != null
                    && int.TryParse(instanceOwnerPartyId.ToString(), out var instanceOwnerPartyIdInt)
                )
                {
                    activity.SetInstanceOwnerPartyId(instanceOwnerPartyIdInt);
                }

                var routeValues = context.Request.RouteValues;
                if (TryGetGuid(routeValues, "instanceGuid", out var instanceGuid))
                {
                    activity.SetInstanceId(instanceGuid);
                }

                if (TryGetGuid(routeValues, "dataGuid", out var dataGuid))
                {
                    activity.SetDataElementId(dataGuid);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while enriching trace telemetry.");
            }
        }

        var metrics = context.Features.Get<IHttpMetricsTagsFeature>();
        if (metrics is not null)
        {
            var tags = metrics.Tags;
            try
            {
                var authenticationContext = context.RequestServices.GetRequiredService<IAuthenticationContext>();
                var auth = authenticationContext.Current;

                tags.Add(new Tag(Labels.UserAuthenticationType, auth.GetType().Name));
                tags.Add(new Tag(Labels.UserAuthenticationTokenIssuer, auth.TokenIssuer));
                tags.Add(new Tag(Labels.UserAuthenticationTokenIsExchanged, auth.TokenIsExchanged));
                // Not the token's client ID, which has a value for every integration: it stays on the span.
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while enriching metric telemetry.");
            }
        }

        await _next(context);
    }

    // Route values are strings until model binding converts them, which happens after this middleware.
    private static bool TryGetGuid(RouteValueDictionary routeValues, string key, out Guid value)
    {
        switch (routeValues.TryGetValue(key, out var raw) ? raw : null)
        {
            case Guid guid:
                value = guid;
                return true;
            case string text:
                return Guid.TryParse(text, out value);
            default:
                value = default;
                return false;
        }
    }
}

/// <summary>
/// Extension methods for adding the <see cref="TelemetryEnrichingMiddleware"/> to the application pipeline.
/// </summary>
public static class TelemetryEnrichingMiddlewareExtensions
{
    /// <summary>
    /// Adds the <see cref="TelemetryEnrichingMiddleware"/> to the application's request pipeline.
    /// </summary>
    /// <param name="app">The application builder.</param>
    public static IApplicationBuilder UseTelemetryEnricher(this IApplicationBuilder app)
    {
        return app.UseMiddleware<TelemetryEnrichingMiddleware>(
            app.ApplicationServices.GetRequiredService<ILogger<TelemetryEnrichingMiddleware>>()
        );
    }
}
