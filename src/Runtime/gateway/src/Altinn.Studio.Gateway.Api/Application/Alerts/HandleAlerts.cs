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
        CancellationToken cancellationToken,
        string environment = "prod"
    )
    {
        IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            metricsClientSettings.CurrentValue.Provider
        );
        var currentGatewayContext = gatewayContext.CurrentValue;

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

        var alerts = alertPayload
            .Alerts.Select(alertInstance => new AlertInstance
            {
                Status = alertInstance.Status,
                App = alertInstance.Labels.GetValueOrDefault("cloud_RoleName", string.Empty),
            })
            .Where(alertInstance => !string.IsNullOrEmpty(alertInstance.App))
            .ToList();

        if (alerts.Count == 0)
        {
            return Results.BadRequest();
        }

        int? intervalInMinutes = int.TryParse(
            firstAlert.Annotations.GetValueOrDefault("intervalInMinutes"),
            out var interval
        )
            ? interval
            : null;
        var to = DateTimeOffset.UtcNow;
        var from = intervalInMinutes.HasValue ? to.AddMinutes(-intervalInMinutes.Value) : to.AddMinutes(-5);
        var apps = alerts.Select(alertInstance => alertInstance.App).ToList();

        var logsUrl = metricsClient.GetLogsUrl(
            currentGatewayContext.AzureSubscriptionId,
            currentGatewayContext.ServiceOwner,
            currentGatewayContext.Environment,
            apps,
            ruleId,
            from,
            to
        );

        var alert = new Alert
        {
            Id = firstAlert.Fingerprint,
            RuleId = ruleId,
            Name = firstAlert.Labels.GetValueOrDefault("alertname", string.Empty),
            Alerts = alerts,
            Url = firstAlert.GeneratorURL,
            LogsUrl = logsUrl,
        };

        await designerClient.NotifyAlertsUpdated(alert, environment, cancellationToken);

        return Results.Ok();
    }
}
