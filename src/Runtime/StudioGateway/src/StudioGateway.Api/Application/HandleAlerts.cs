using StudioGateway.Api.Clients.AlertsClient;
using StudioGateway.Api.Clients.AlertsClient.Contracts;
using StudioGateway.Api.Clients.Designer;
using StudioGateway.Api.Settings;
using StudioGateway.Contracts.Alerts;

namespace StudioGateway.Api.Application;

internal static class HandleAlerts
{
    internal static async Task<IResult> GetAlertRulesAsync(
        IServiceProvider serviceProvider,
        AlertsClientSettings alertsClientSettings,
        CancellationToken cancellationToken
    )
    {
        IAlertsClient client = serviceProvider.GetRequiredKeyedService<IAlertsClient>(alertsClientSettings.Provider);

        IEnumerable<GrafanaAlertRule> alertRules = await client.GetAlertRulesAsync(cancellationToken);

        return Results.Ok(
            alertRules?.Select(alert =>
            {
                return new AlertRule
                {
                    Id = alert.Id,
                    Uid = alert.Uid,
                    FolderUid = alert.FolderUid,
                    RuleGroup = alert.RuleGroup,
                    Title = alert.Title,
                    Updated = alert.Updated,
                    NoDataState = alert.NoDataState,
                    ExecErrState = alert.ExecErrState,
                    For = alert.For,
                    IsPaused = alert.IsPaused,
                };
            }) ?? []
        );
    }

    internal static async Task<IResult> NotifyAlertsUpdatedAsync(
        DesignerClient designerClient,
        CancellationToken cancellationToken,
        string environment = AltinnEnvironments.Prod
    )
    {
        await designerClient.NotifyAlertsUpdatedAsync(environment, cancellationToken);
        return Results.Ok();
    }
}
