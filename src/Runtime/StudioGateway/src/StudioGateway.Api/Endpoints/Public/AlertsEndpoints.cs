using StudioGateway.Api.Application;
using StudioGateway.Api.Authentication;
using StudioGateway.Api.Hosting;

namespace StudioGateway.Api.Endpoints.Public;

internal static class AlertsEndpoints
{
    public static WebApplication MapAlertsEndpoints(this WebApplication app)
    {
        app.MapGet("/runtime/gateway/api/v1/alerts", HandleAlerts.GetAlertRulesAsync)
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetAlertsRules")
            .WithTags("Alerts");

        app.MapPost("/runtime/gateway/api/v1/alerts", HandleAlerts.NotifyAlertsUpdatedAsync)
            .RequirePublicPort()
            .RequireGrafanaAuthentication()
            .WithName("NotifyAlertsUpdated")
            .WithTags("Alerts");

        return app;
    }
}
