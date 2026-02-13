using StudioGateway.Api.Clients.AlertsClient;
using StudioGateway.Api.Clients.AlertsClient.Contracts;
using StudioGateway.Api.Clients.Designer;
using StudioGateway.Api.Clients.Designer.Contracts;
using StudioGateway.Api.Clients.MetricsClient;
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

        var alerts = alertPayload
            .Alerts.Where(a =>
            {
                var ruleId = a.Annotations.GetValueOrDefault("ruleId");
                return !string.IsNullOrEmpty(ruleId) && AzureMonitorClient.OperationNameKeys.Contains(ruleId);
            })
            .GroupBy(a => a.Annotations["ruleId"])
            .Select(alertGroup =>
            {
                var intervalInMinutes = int.TryParse(
                    alertGroup.First().Annotations.GetValueOrDefault("intervalInMinutes"),
                    out var interval
                )
                    ? interval
                    : (int?)null;

                var apps = alertGroup
                    .Select(a => a.Labels.GetValueOrDefault("cloud_RoleName", "unknown"))
                    .Where(app => app != "unknown")
                    .Distinct()
                    .ToList();

                var now = DateTimeOffset.UtcNow;
                var from = intervalInMinutes.HasValue ? now.AddMinutes(-intervalInMinutes.Value) : now.AddMinutes(-60);

                return new Alert
                {
                    RuleId = alertGroup.Key,
                    Name = alertGroup.First().Labels.GetValueOrDefault("alertname", "unknown"),
                    Alerts = alertGroup.Select(a => new AlertInstance
                    {
                        Status = a.Status,
                        App = a.Labels.GetValueOrDefault("cloud_RoleName", "unknown"),
                    }),
                    URL = alertGroup.First().GeneratorURL,
                    LogsUrl =
                        apps.Count > 0
                            ? metricsClient.GetLogsUrl(
                                gatewayContext.AzureSubscriptionId,
                                gatewayContext.ServiceOwner,
                                gatewayContext.Environment,
                                apps,
                                alertGroup.Key,
                                from,
                                now
                            )
                            : null,
                };
            });

        await designerClient.NotifyAlertsUpdatedAsync(alerts, environment, cancellationToken);

        return Results.Ok();
    }
}
