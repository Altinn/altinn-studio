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
            alert.RuleId,
            alert.Name,
            alert.URL,
            alert.IntervalInMinutes,
            FiringApps = alert.Alerts
                .Where(a => a.Status == "firing")
                .Select(a => a.App)
                .ToList()
        })
        .Where(a => a.FiringApps.Count > 0);

        var defaultInterval = firingAlerts.FirstOrDefault()?.IntervalInMinutes;
        string? fromIso = null;
        string? toIso = null;
        if (defaultInterval.HasValue)
        {
            DateTimeOffset to = DateTimeOffset.UtcNow;
            DateTimeOffset from = to.AddMinutes(-defaultInterval.Value);
            fromIso = Uri.EscapeDataString(from.ToString("O"));
            toIso = Uri.EscapeDataString(to.ToString("O"));
        }

        await Task.WhenAll(
            firingAlerts.Select(async alert =>
            {
                Uri? appInsightsUrl = BuildAppInsightsUrl(
                    org,
                    environment,
                    alert.RuleId,
                    alert.FiringApps,
                    fromIso,
                    toIso,
                    defaultInterval.HasValue);

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

        var links = new List<SlackText>();
        if (grafanaUrl is not null)
        {
            links.Add(new SlackText { Type = "mrkdwn", Text = $"<{grafanaUrl}|Grafana>" });
        }
        if (appInsightsUrl is not null)
        {
            links.Add(new SlackText { Type = "mrkdwn", Text = $"<{appInsightsUrl}|Application Insights>" });
        }

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

    private Uri? BuildAppInsightsUrl(
        string org,
        AltinnEnvironment environment,
        string? ruleId,
        IEnumerable<string> apps,
        string? fromIso,
        string? toIso,
        bool hasInterval)
    {
        if (string.IsNullOrWhiteSpace(ruleId) || !hasInterval || fromIso is null || toIso is null)
        {
            return null;
        }

        IEnumerable<string> queryParts = apps.Select(app => $"apps={Uri.EscapeDataString(app)}").Concat([
            $"metric={Uri.EscapeDataString(ruleId)}",
            $"from={fromIso}",
            $"to={toIso}",
        ]);
        string queryString = string.Join("&", queryParts);
        return new Uri($"https://{generalSettings.HostName}/designer/api/v1/admin/metrics/{org}/{environment.Name}/app/errors/logs?{queryString}");
    }
}
