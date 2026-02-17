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
        GatewayContext gatewayContext,
        IServiceProvider serviceProvider,
        MetricsClientSettings metricsClientSettings,
        DesignerClient designerClient,
        AlertPayload alertPayload,
        CancellationToken cancellationToken,
        string environment = "prod"
    )
    {
        IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            metricsClientSettings.Provider
        );

        var firstAlert = alertPayload.Alerts.FirstOrDefault();
        if (firstAlert is null)
        {
            return Results.BadRequest();
        }

        var ruleId = alertPayload.Alerts.First().Annotations.GetValueOrDefault("ruleId");
        if (string.IsNullOrEmpty(ruleId) || !AzureMonitorClient.OperationNameKeys.Contains(ruleId))
        {
            return Results.BadRequest();
        }

        var from = firstAlert.StartsAt;
        var to = DateTimeOffset.UtcNow;
        var alerts = alertPayload.Alerts.Select(a => new AlertInstance
        {
            Status = a.Status,
            App = a.Labels.GetValueOrDefault("cloud_RoleName", string.Empty),
        });
        var apps = alerts.Select(alertInstance => alertInstance.App).ToList();
        var logsUrl =
            apps.Count > 0
                ? metricsClient.GetLogsUrl(
                    gatewayContext.AzureSubscriptionId,
                    gatewayContext.ServiceOwner,
                    gatewayContext.Environment,
                    apps,
                    ruleId,
                    from,
                    to
                )
                : null;

        var alert = new Alert
        {
            Id = firstAlert.Fingerprint,
            RuleId = ruleId,
            Name = firstAlert.Labels.GetValueOrDefault("alertname", "unknown"),
            Alerts = alerts,
            URL = firstAlert.GeneratorURL,
            LogsUrl = logsUrl,
        };

        await designerClient.NotifyAlertsUpdatedAsync(alert, environment, cancellationToken);

        return Results.Ok();
    }
}
