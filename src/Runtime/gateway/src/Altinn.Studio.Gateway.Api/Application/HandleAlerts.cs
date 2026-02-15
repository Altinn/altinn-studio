using Altinn.Studio.Gateway.Api.Clients.AlertsClient;
using Altinn.Studio.Gateway.Api.Clients.AlertsClient.Contracts;
using Altinn.Studio.Gateway.Api.Clients.Designer;
using Altinn.Studio.Gateway.Api.Clients.Designer.Contracts;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Contracts.Alerts;

namespace Altinn.Studio.Gateway.Api.Application;

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
        AlertPayload alertPayload,
        CancellationToken cancellationToken,
        string environment = AltinnEnvironments.Prod
    )
    {
        var alerts = alertPayload
            .Alerts.Where(a =>
            {
                var ruleId = a.Labels.GetValueOrDefault("RuleId");
                return !string.IsNullOrEmpty(ruleId) && AzureMonitorClient.OperationNameKeys.Contains(ruleId);
            })
            .GroupBy(a => a.Labels["alertname"])
            .Select(alerts =>
            {
                return new Alert
                {
                    Id = alerts.First().Labels["RuleId"],
                    Name = alerts.Key,
                    Alerts = alerts.Select(a => new AlertInstance
                    {
                        Status = a.Status,
                        App = a.Labels.GetValueOrDefault("cloud_RoleName", "unknown"),
                    }),
                    URL = alerts.First().GeneratorURL,
                };
            });

        await designerClient.NotifyAlertsUpdatedAsync(alerts, environment, cancellationToken);

        return Results.Ok();
    }
}
