#nullable disable
using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Hubs.AlertsUpdate;
using Altinn.Studio.Designer.Hubs.Assistant;
using Altinn.Studio.Designer.Hubs.EntityUpdate;
using Altinn.Studio.Designer.Hubs.Preview;
using Altinn.Studio.Designer.Infrastructure.StudioOidc;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Hubs;

public static class HubsEndpointExtensions
{
    private const string HubsPath = "/hubs";
    private const string NegotiatePath = "/negotiate";

    public static void MapHubs(this IEndpointRouteBuilder endpoints)
    {
        // all hubs should have /hubs prefix
        endpoints.MapHub<PreviewHub>("/hubs/preview", options => options.CloseOnAuthenticationExpiration = true);
        endpoints.MapHub<Sync.SyncHub>("/hubs/sync", options => options.CloseOnAuthenticationExpiration = true);
        endpoints.MapHub<EntityUpdatedHub>(
            "/hubs/entity-updated",
            options => options.CloseOnAuthenticationExpiration = true
        );
        endpoints.MapHub<AlertsUpdatedHub>(
            "/hubs/alerts-updated",
            options => options.CloseOnAuthenticationExpiration = true
        );
        endpoints
            .MapHub<AssistantProxyHub>("/hubs/assistant")
            .RequireAuthorization(policy =>
                policy.RequireAssertion(context => !StudioAuthenticationProviders.IsMockporten(context.User))
            );
    }

    /// <summary>
    /// Whether a request is a hub connection: the request a client keeps open for as long as it's connected. A
    /// connection isn't a unit of work, so it's left out of traces and the request metrics. Each hub method call,
    /// connect and disconnect is a root span of its own instead, which <see cref="HubTelemetryFilter"/> gives the
    /// connection's ID.
    /// </summary>
    public static bool IsHubConnection(HttpRequest request) =>
        request.Path.StartsWithSegments(HubsPath)
        && !request.Path.Value.EndsWith(NegotiatePath, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Leaves hub connections out of the request metrics, where their duration is the length of a session. A
    /// connection attempt that fails, such as a 401 after the session expired, is still counted.
    /// </summary>
    public static IApplicationBuilder ExcludeHubConnectionsFromRequestMetrics(this IApplicationBuilder app) =>
        app.Use(
            (context, next) => IsHubConnection(context.Request) ? ExcludeIfSucceededAsync(context, next) : next(context)
        );

    private static async Task ExcludeIfSucceededAsync(HttpContext context, RequestDelegate next)
    {
        await next(context);
        if (
            context.Response.StatusCode < StatusCodes.Status400BadRequest
            && context.Features.Get<IHttpMetricsTagsFeature>() is { } metrics
        )
        {
            metrics.MetricsDisabled = true;
        }
    }
}
