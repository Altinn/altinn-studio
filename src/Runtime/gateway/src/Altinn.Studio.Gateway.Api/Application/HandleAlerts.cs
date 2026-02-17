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

        var ruleId = firstAlert.Annotations.GetValueOrDefault("ruleId");
        if (string.IsNullOrEmpty(ruleId) || !AzureMonitorClient.OperationNameKeys.Contains(ruleId))
        {
            return Results.BadRequest();
        }

        var alerts = alertPayload.Alerts.Select(a => new AlertInstance
        {
            Status = a.Status,
            App = a.Labels.GetValueOrDefault("cloud_RoleName", string.Empty),
        });

        var from = firstAlert.StartsAt;
        var to = DateTimeOffset.UtcNow;
        var apps = alerts.Select(alertInstance => alertInstance.App).Where(app => !string.IsNullOrEmpty(app)).ToList();

        var logsUrl = metricsClient.GetLogsUrl(
            gatewayContext.AzureSubscriptionId,
            gatewayContext.ServiceOwner,
            gatewayContext.Environment,
            apps,
            ruleId,
            from,
            to
        );

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
