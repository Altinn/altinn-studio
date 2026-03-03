using Altinn.Studio.Gateway.Api.Application;
using Altinn.Studio.Gateway.Api.Authentication;

namespace Altinn.Studio.Gateway.Api.Endpoints.Public;

internal static class AlertsEndpoints
{
    public static RouteGroupBuilder MapAlertsEndpoints(this RouteGroupBuilder publicApiV1)
    {
        var alertsApi = publicApiV1.MapGroup("/alerts").WithTags("Alerts");

        alertsApi
            .MapGet(string.Empty, HandleAlerts.GetAlertRules)
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetAlertsRules");

        alertsApi
            .MapPost(string.Empty, HandleAlerts.NotifyAlertsUpdated)
            .RequireGrafanaAuthentication()
            .WithName("NotifyAlertsUpdated");

        return publicApiV1;
    }
}
