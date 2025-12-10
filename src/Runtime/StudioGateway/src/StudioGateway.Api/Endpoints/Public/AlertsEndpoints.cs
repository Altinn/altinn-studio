using StudioGateway.Api.Hosting;
using StudioGateway.Api.Services.Alerts;

namespace StudioGateway.Api.Endpoints.Public;

internal static class AlertsEndpoints
{
    public static WebApplication MapAlertsEndpoints(this WebApplication app)
    {
        app.MapGet(
                "/runtime/gateway/api/v1/alerts",
                async (IAlertsService alertsService, CancellationToken cancellationToken) =>
                {
                    var alertRules = await alertsService.GetAlertRulesAsync(cancellationToken);
                    return Results.Ok(alertRules);
                }
            )
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetAlertsRules")
            .WithTags("Alerts");

        app.MapPost(
                "/runtime/gateway/api/v1/alerts",
                async (IAlertsService alertsService, CancellationToken cancellationToken) =>
                {
                    await alertsService.NotifyAlertsUpdatedAsync(cancellationToken);
                    return Results.Ok();
                }
            )
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("NotifyAlertsUpdated")
            .WithTags("Alerts");

        return app;
    }
}
