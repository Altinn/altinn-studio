using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Hubs.AlertsUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.Slack;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class AlertsService(
    IRuntimeGatewayClient runtimeGatewayClient,
    IHubContext<AlertsUpdatedHub, IAlertsUpdateClient> alertsUpdatedHubContext,
    ISlackClient slackClient,
    AlertsSettings alertsSettings,
    GeneralSettings generalSettings,
    ILogger<AlertsService> logger
    ) : IAlertsService
{
    /// <inheritdoc />
    public async Task<IEnumerable<AlertRule>> GetAlertRulesAsync(
        string org,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    )
    {
        return await runtimeGatewayClient.GetAlertRulesAsync(org, environment, cancellationToken);
    }

    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(string org, AltinnEnvironment environment, Alert alert, CancellationToken cancellationToken)
    {
        var apps = alert.Alerts.Where(alertInstance => alertInstance.Status == "firing").Select(alertInstance => alertInstance.App).ToList();

        if (apps.Count > 0)
        {
            await SendToSlackAsync(org, environment, apps, alert.Name, alert.Url, alert.LogsUrl, cancellationToken);
        }

        await alertsUpdatedHubContext.Clients.Group(org).AlertsUpdated(new AlertsUpdated(environment.Name));
    }

    private async Task SendToSlackAsync(string org, AltinnEnvironment environment, List<string> apps, string alertName, Uri grafanaUrl, Uri appInsightsUrl, CancellationToken cancellationToken)
    {
        string studioEnv = generalSettings.OriginEnvironment;
        string appsFormatted = string.Join(", ", apps.Select(a => $"`{a}`"));
        const string Emoji = ":x:";

        var links = new List<SlackText>
        {
            new() { Type = "mrkdwn", Text = $"<{grafanaUrl}|Grafana>" },
            new() { Type = "mrkdwn", Text = $"<{appInsightsUrl.OriginalString}|Application Insights>" }
        };

        var message = new SlackMessage
        {
            Text = $"{Emoji} `{org}` - `{environment.Name}` - {appsFormatted} - *{alertName}*",
            Blocks =
            [
                new SlackBlock
                {
                    Type = "section",
                    Text = new SlackText { Type = "mrkdwn", Text = $"{Emoji} *{alertName}*" },
                },
                new SlackBlock
                {
                    Type = "context",
                    Elements = new List<SlackText>
                    {
                        new() { Type = "mrkdwn", Text = $"Org: `{org}`" },
                        new() { Type = "mrkdwn", Text = $"Env: `{environment.Name}`" },
                        new() { Type = "mrkdwn", Text = $"Apps: {appsFormatted}" },
                        new() { Type = "mrkdwn", Text = $"Studio env: `{studioEnv}`" },
                    },
                },
                new SlackBlock
                {
                    Type = "context",
                    Elements = links
                }
            ],
        };
        try
        {
            await slackClient.SendMessageAsync(alertsSettings.GetSlackWebhookUrl(environment), message, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Failed to send Slack alert notification. Alert Name: {AlertName}", alertName);
        }
    }
}
