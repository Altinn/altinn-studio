using StudioGateway.Api.Clients.AlertsClient;
using StudioGateway.Api.Clients.AlertsClient.Contracts;
using StudioGateway.Api.Clients.Designer;
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
        ISlackClient slackClient,
        DesignerClient designerClient,
        AlertPayload alertPayload,
        ILogger logger,
        CancellationToken cancellationToken,
        string environment = "prod"
    )
    {
        var alertsByName = alertPayload.Alerts
            .GroupBy(a => a.Labels["alertname"])
            .ToList();

        await Task.WhenAll(alertsByName.Select(group => SendSlackNotificationAsync(
                slackClient,
                logger,
                gatewayContext.ServiceOwner,
                gatewayContext.Environment,
                group.Select(a => a.Labels["cloud_RoleName"]).ToList(),
                environment,
                group.Key,
                group.First().GeneratorURL,
                cancellationToken)
        ));

        await designerClient.NotifyAlertsUpdatedAsync(environment, cancellationToken);

        return Results.Ok();
    }

    private static async Task SendSlackNotificationAsync(
        ISlackClient slackClient,
        ILogger logger,
        string org,
        string env,
        List<string> apps,
        string studioEnv,
        string status,
        string url,
        CancellationToken cancellationToken
    )
    {
        var appsList = string.Join(", ", apps.Select(a => $"`{a}`"));
        try
        {
            var emoji = ":x:";

            var message = new SlackMessage
            {
                Text = $"{emoji} `{org}` - `{env}` - `{appsList}` - *{status}*",
                Blocks =
                [
                    new SlackBlock
                    {
                        Type = "section",
                        Text = new SlackText { Type = "mrkdwn", Text = $"{emoji} *{status}*" },
                    },
                    new SlackBlock
                    {
                        Type = "context",
                        Elements =
                        [
                            new SlackText { Type = "mrkdwn", Text = $"Org: `{org}`" },
                            new SlackText { Type = "mrkdwn", Text = $"Env: `{env}`" },
                            new SlackText { Type = "mrkdwn", Text = $"Apps: {appsList}" },
                            new SlackText { Type = "mrkdwn", Text = $"Studio env: `{studioEnv}`" },
                            new SlackText { Type = "mrkdwn", Text = $"<{url}|Grafana>" },
                        ],
                    },
                ],
            };

            await slackClient.SendMessageAsync(message, cancellationToken);
            logger.LogInformation(
                "Successfully sent Slack alert notification. Status: {Status}, Org: {Org}, Env: {Env}, Apps: {AppsList}, StudioEnv: {StudioEnv}",
                status,
                org,
                env,
                appsList,
                studioEnv
            );
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Failed to send Slack alert notification. Status: {Status}, Org: {Org}, Env: {Env}, Apps: {AppsList}, StudioEnv: {StudioEnv}",
                status,
                org,
                env,
                appsList,
                studioEnv
            );
        }
    }
}
