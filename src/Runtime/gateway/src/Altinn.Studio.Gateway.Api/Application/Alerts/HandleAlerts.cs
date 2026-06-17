using Altinn.Studio.Gateway.Api.Clients.AlertsClient;
using Altinn.Studio.Gateway.Api.Clients.AlertsClient.Contracts;
using Altinn.Studio.Gateway.Api.Clients.Designer;
using Altinn.Studio.Gateway.Api.Clients.Designer.Contracts;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Contracts.Alerts;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HandleAlerts
{
    internal static async Task<IResult> GetAlertRules(
        IServiceProvider serviceProvider,
        IOptionsMonitor<AlertsClientSettings> alertsClientSettings,
        CancellationToken cancellationToken
    )
    {
        IAlertsClient client = serviceProvider.GetRequiredKeyedService<IAlertsClient>(
            alertsClientSettings.CurrentValue.Provider
        );

        IEnumerable<GrafanaAlertRule> alertRules = await client.GetAlertRules(cancellationToken);

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

    internal static async Task<IResult> NotifyAlertsUpdated(
        IOptionsMonitor<GatewayContext> gatewayContext,
        IServiceProvider serviceProvider,
        IOptionsMonitor<MetricsClientSettings> metricsClientSettings,
        DesignerClient designerClient,
        AlertPayload alertPayload,
        IOptionsMonitor<StudioEnvironments> environments,
        CancellationToken cancellationToken
    )
    {
        string? designerEnvironmentLabel = alertPayload.CommonLabels.GetValueOrDefault("DesignerEnvironment");
        string designerEnvironment =
            !string.IsNullOrWhiteSpace(designerEnvironmentLabel)
            && environments.CurrentValue.ContainsKey(designerEnvironmentLabel)
                ? designerEnvironmentLabel
                : "prod";

        IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            metricsClientSettings.CurrentValue.Provider
        );
        var currentGatewayContext = gatewayContext.CurrentValue;

        if (!alertPayload.Alerts.Any())
        {
            return Results.BadRequest();
        }

        var ruleId = alertPayload.CommonAnnotations.GetValueOrDefault("ruleId");
        if (string.IsNullOrEmpty(ruleId) || !AzureMonitorClient.OperationNameKeys.Contains(ruleId))
        {
            return Results.BadRequest();
        }

        var apps = alertPayload
            .Alerts.GroupBy(a => a.Labels.GetValueOrDefault("cloud_RoleName", string.Empty))
            .Where(g => !string.IsNullOrEmpty(g.Key))
            .Select(g => new AlertApp
            {
                App = g.Key,
                Instances = g.Select(a => new AlertInstance
                    {
                        Status = a.Status,
                        InstanceId = a.Labels.GetValueOrDefault("instanceId", string.Empty),
                    })
                    .ToList(),
            })
            .ToList();

        if (apps.Count == 0)
        {
            return Results.BadRequest();
        }

        int? intervalInMinutes = int.TryParse(
            alertPayload.CommonAnnotations.GetValueOrDefault("intervalInMinutes"),
            out var interval
        )
            ? interval
            : null;
        var to = alertPayload.Alerts.Min(a => a.StartsAt);
        var from = intervalInMinutes.HasValue ? to.AddMinutes(-intervalInMinutes.Value) : to.AddMinutes(-5);
        var appNames = apps.Select(a => a.App).ToList();

        var logsUrl = metricsClient.GetLogsUrl(
            currentGatewayContext.AzureSubscriptionId,
            currentGatewayContext.ServiceOwner,
            currentGatewayContext.Environment,
            appNames,
            ruleId,
            from,
            to
        );

        var alert = new Alert
        {
            Id = string.Join(
                "-",
                alertPayload.Alerts.Select(a => $"{a.Fingerprint}:{a.StartsAt.ToUnixTimeSeconds()}").Order()
            ),
            RuleId = ruleId,
            Name = alertPayload.CommonLabels.GetValueOrDefault("alertname", string.Empty),
            Apps = apps,
            Url = alertPayload.Alerts.First().GeneratorURL,
            LogsUrl = logsUrl,
        };

        await designerClient.NotifyAlertsUpdated(alert, designerEnvironment, cancellationToken);

        return Results.Ok();
    }
}
