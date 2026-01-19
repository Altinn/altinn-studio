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
    public async Task NotifyAlertsUpdatedAsync(string org, AltinnEnvironment environment, IEnumerable<Alert> alerts, CancellationToken cancellationToken)
    {
        var firingAlerts = alerts
        .Select(alert => new
        {
            alert.Id,
            alert.Name,
            alert.URL,
            FiringApps = alert.Alerts
                .Where(a => a.Status == "firing")
                .Select(a => a.App)
                .ToList()
        })
        .Where(a => a.FiringApps.Count > 0);

        await Task.WhenAll(
            firingAlerts.Select(async alert =>
            {
                string appsParam = Uri.EscapeDataString(string.Join(", ", alert.FiringApps));
                Uri? appInsightsUrl = !string.IsNullOrWhiteSpace(alert.Id) ? new Uri($"https://{generalSettings.HostName}/designer/api/v1/admin/metrics/{org}/{environment}/app/errors/logs?app={appsParam}&metric={alert.Id}&range=15") : null;

                await SendToSlackAsync(org, environment, alert.FiringApps, alert.Name, alert.URL, appInsightsUrl, cancellationToken);

            })
        );

        await alertsUpdatedHubContext.Clients.Group(org).AlertsUpdated(new AlertsUpdated(environment.Name));
    }

    private async Task SendToSlackAsync(string org, AltinnEnvironment environment, List<string> apps, string alertName, Uri grafanaUrl, Uri? appInsightsUrl, CancellationToken cancellationToken)
    {
        string studioEnv = generalSettings.OriginEnvironment;
        string appsFormatted = string.Join(", ", apps.Select(a => $"`{a}`"));
        const string Emoji = ":x:";
        var elements = new List<SlackText>
        {
            new() { Type = "mrkdwn", Text = $"Org: `{org}`" },
            new() { Type = "mrkdwn", Text = $"Env: `{environment.Name}`" },
            new() { Type = "mrkdwn", Text = $"Apps: {appsFormatted}" },
            new() { Type = "mrkdwn", Text = $"Studio env: `{studioEnv}`" },
        };

        if (grafanaUrl is not null)
        {
            elements.Add(new SlackText { Type = "mrkdwn", Text = $"<{grafanaUrl}|Grafana>" });
        }

        if (appInsightsUrl is not null)
        {
            elements.Add(new SlackText { Type = "mrkdwn", Text = $"<{appInsightsUrl}|Application Insights>" });
        }

        var message = new SlackMessage
        {
            Text = $"{Emoji} `{org}` - `{environment}` - {appsFormatted} - *{alertName}*",
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
                        Elements = elements,
                    },
                ],
        };
        try
        {
            await slackClient.SendMessageAsync(alertsSettings.SlackWebhookUrl, message, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send Slack alert notification. Alert Name: {AlertName}", alertName);
        }
    }
}
