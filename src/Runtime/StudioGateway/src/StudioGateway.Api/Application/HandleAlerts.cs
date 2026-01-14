using StudioGateway.Api.Clients.AlertsClient;
using StudioGateway.Api.Clients.AlertsClient.Contracts;
using StudioGateway.Api.Clients.Designer;
using StudioGateway.Api.Clients.MetricsClient;
using StudioGateway.Api.Clients.SlackClient;
using StudioGateway.Api.Clients.SlackClient.Contracts;
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
        ISlackClient slackClient,
        MetricsClientSettings metricsClientSettings,
        DesignerClient designerClient,
        AlertPayload alertPayload,
        ILogger<Program> logger,
        CancellationToken cancellationToken,
        string environment = "prod"
    )
    {
        var alertsByName = alertPayload
            .Alerts.Where(a => a.Status == "firing" && a.Labels.ContainsKey("alertname"))
            .GroupBy(a => a.Labels["alertname"])
            .ToList();

        await Task.WhenAll(
            alertsByName.Select(group =>
                SendSlackNotificationAsync(
                    gatewayContext,
                    serviceProvider,
                    slackClient,
                    metricsClientSettings,
                    logger,
                    gatewayContext.ServiceOwner,
                    gatewayContext.Environment,
                    group.Select(a => a.Labels.GetValueOrDefault("cloud_RoleName", "unknown")).Distinct().ToList(),
                    environment,
                    group.Key,
                    group.First().GeneratorURL,
                    group.First().Labels.GetValueOrDefault("RuleId"),
                    cancellationToken
                )
            )
        );

        try
        {
            await designerClient.NotifyAlertsUpdatedAsync(environment, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Failed to notify Designer about alerts update");
        }

        return Results.Ok();
    }

    private static async Task SendSlackNotificationAsync(
        GatewayContext gatewayContext,
        IServiceProvider serviceProvider,
        ISlackClient slackClient,
        MetricsClientSettings metricsClientSettings,
        ILogger logger,
        string org,
        string env,
        List<string> apps,
        string studioEnv,
        string alertName,
        Uri? url,
        string? ruleId,
        CancellationToken cancellationToken
    )
    {
        var appsPlain = string.Join(", ", apps);
        var appsFormatted = string.Join(", ", apps.Select(a => $"`{a}`"));
        try
        {
            var emoji = ":x:";

            var message = new SlackMessage
            {
                Text = $"{emoji} `{org}` - `{env}` - {appsFormatted} - *{alertName}*",
                Blocks =
                [
                    new SlackBlock
                    {
                        Type = "section",
                        Text = new SlackText { Type = "mrkdwn", Text = $"{emoji} *{alertName}*" },
                    },
                    new SlackBlock
                    {
                        Type = "context",
                        Elements = BuildContextElements(
                            gatewayContext,
                            serviceProvider,
                            metricsClientSettings,
                            org,
                            env,
                            appsPlain,
                            appsFormatted,
                            studioEnv,
                            url,
                            ruleId
                        ),
                    },
                ],
            };

            await slackClient.SendMessageAsync(message, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Failed to send Slack alert notification. Alert Name: {AlertName}, Org: {Org}, Env: {Env}, Apps: {AppsList}, StudioEnv: {StudioEnv}",
                alertName,
                org,
                env,
                appsPlain,
                studioEnv
            );
        }
    }

    private static List<SlackText> BuildContextElements(
        GatewayContext gatewayContext,
        IServiceProvider serviceProvider,
        MetricsClientSettings metricsClientSettings,
        string org,
        string env,
        string appsPlain,
        string appsFormatted,
        string studioEnv,
        Uri? url,
        string? ruleId
    )
    {
        var elements = new List<SlackText>
        {
            new() { Type = "mrkdwn", Text = $"Org: `{org}`" },
            new() { Type = "mrkdwn", Text = $"Env: `{env}`" },
            new() { Type = "mrkdwn", Text = $"Apps: {appsFormatted}" },
            new() { Type = "mrkdwn", Text = $"Studio env: `{studioEnv}`" },
        };

        if (url is not null)
        {
            elements.Add(new SlackText { Type = "mrkdwn", Text = $"<{url}|Grafana>" });
        }

        if (ruleId is not null)
        {
            IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
                metricsClientSettings.Provider
            );
            Uri logsUrl = metricsClient.GetLogsUrl(
                gatewayContext.AzureSubscriptionId,
                gatewayContext.ServiceOwner,
                gatewayContext.Environment,
                appsPlain,
                ruleId,
                5
            );
            var encodedLogsUrl = logsUrl.ToString().Replace("<", "%3C").Replace(">", "%3E").Replace("|", "%7C");
            elements.Add(new SlackText { Type = "mrkdwn", Text = $"<{encodedLogsUrl}|Application Insights>" });
        }

        return elements;
    }
}
