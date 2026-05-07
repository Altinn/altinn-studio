using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Hubs.AlertsUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.ContactPoint;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification.Models;
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
    IAltinnNotificationClient altinnNotificationsClient,
    GeneralSettings generalSettings,
    IContactPointsRepository contactPointsRepository,
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
    public async Task NotifyAlertsUpdatedAsync(
        string org,
        AltinnEnvironment environment,
        Alert alert,
        CancellationToken cancellationToken
    )
    {
        var apps = alert
            .Alerts.Where(alertInstance => alertInstance.Status == "firing")
            .Select(alertInstance => alertInstance.App)
            .ToList();

        if (apps.Count > 0)
        {
            await Task.WhenAll(
                NotifyInternalAsync(org, environment, apps, alert, cancellationToken),
                NotifyServiceOwnersAsync(org, environment, apps, alert, cancellationToken)
            );
        }

        await alertsUpdatedHubContext.Clients.Group(org).AlertsUpdated(new AlertsUpdated(environment.Name));
    }

    private async Task NotifyInternalAsync(
        string org,
        AltinnEnvironment environment,
        List<string> apps,
        Alert alert,
        CancellationToken cancellationToken
    )
    {
        try
        {
            await SendToSlackAsync(
                org,
                environment,
                apps,
                alert.Name,
                alert.Url,
                alert.LogsUrl,
                alertsSettings.GetSlackWebhookUrl(environment),
                cancellationToken
            );
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(
                ex,
                "Failed to send internal Slack alert for org {Org} in environment {Environment}",
                org,
                environment.Name
            );
        }
    }

    private async Task NotifyServiceOwnersAsync(
        string org,
        AltinnEnvironment environment,
        List<string> apps,
        Alert alert,
        CancellationToken cancellationToken
    )
    {
        IReadOnlyList<ContactPointEntity> contactPoints;
        try
        {
            contactPoints = await contactPointsRepository.GetActiveByOrgAndEnvironmentAsync(
                org,
                environment.Name,
                cancellationToken
            );
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(
                ex,
                "Failed to retrieve contact points for org {Org} in environment {Environment}",
                org,
                environment.Name
            );
            return;
        }

        List<Task> notificationTasks = contactPoints
            .SelectMany(contactPoint =>
                contactPoint.Methods.Select(method =>
                    SendContactMethodAsync(contactPoint, method, org, environment, apps, alert, cancellationToken)
                )
            )
            .ToList();

        await Task.WhenAll(notificationTasks);
    }

    private async Task SendContactMethodAsync(
        ContactPointEntity contactPoint,
        ContactMethodEntity method,
        string org,
        AltinnEnvironment environment,
        List<string> apps,
        Alert alert,
        CancellationToken cancellationToken
    )
    {
        try
        {
            switch (method.MethodType)
            {
                case ContactMethodType.Email:
                    var alertTitle = $"❌ {alert.Name}";
                    await altinnNotificationsClient.SendEmailNotification(
                        $"{contactPoint.Id}-{method.Id}-{alert.Id}",
                        method.Value,
                        alertTitle,
                        FormatEmailBody(org, environment, apps, alertTitle, alert.Url, alert.LogsUrl),
                        EmailContentType.Html,
                        cancellationToken: cancellationToken
                    );
                    break;
                case ContactMethodType.Sms:
                    await altinnNotificationsClient.SendSmsNotification(
                        $"{contactPoint.Id}-{method.Id}-{alert.Id}",
                        method.Value,
                        FormatSmsBody(org, environment, apps, alert.Name),
                        cancellationToken: cancellationToken
                    );
                    break;
                case ContactMethodType.Slack:
                    await SendToSlackAsync(
                        org,
                        environment,
                        apps,
                        alert.Name,
                        alert.Url,
                        alert.LogsUrl,
                        new Uri(method.Value),
                        cancellationToken
                    );
                    break;
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(
                ex,
                "Failed to send alert notification to contact point {ContactPointId} via {MethodType}. Alert: {AlertName}",
                contactPoint.Id,
                method.MethodType,
                alert.Name
            );
        }
    }

    private string FormatSmsBody(string org, AltinnEnvironment environment, List<string> apps, string alertTitle)
    {
        string appsFormatted = string.Join(", ", apps);
        string studioMiljø = !generalSettings.IsProd ? $"\nStudio-miljø: {generalSettings.OriginEnvironment}" : "";

        return $@"{alertTitle}

Organisasjon: {org}
Miljø: {environment.Name}
Applikasjoner: {appsFormatted}{studioMiljø}";
    }

    private string FormatEmailBody(
        string org,
        AltinnEnvironment environment,
        List<string> apps,
        string alertTitle,
        Uri grafanaUrl,
        Uri appInsightsUrl
    )
    {
        string appsFormatted = string.Join(", ", apps.Select(a => $"<b>{WebUtility.HtmlEncode(a)}</b>"));

        var mailBody = $"""
            <h1>{WebUtility.HtmlEncode(alertTitle)}</h1>
            <table cellpadding="4">
                <tbody>
                    <tr>
                        <td>Organisasjon:</td>
                        <td><b>{WebUtility.HtmlEncode(org)}</b></td>
                    </tr>
                    <tr>
                        <td>Miljø:</td>
                        <td><b>{WebUtility.HtmlEncode(environment.Name)}</b></td>
                    </tr>
                    <tr>
                        <td>Applikasjoner:</td>
                        <td>{appsFormatted}</td>
                    </tr>
                    {(!generalSettings.IsProd ? $"""
                        <tr>
                            <td>Studio-miljø:</td>
                            <td><b>{WebUtility.HtmlEncode(generalSettings.OriginEnvironment)}</b></td>
                        </tr>
                    """ : "")}
                </tbody>
            </table>
            <table cellpadding="4">
                <tbody>
                    <tr>
                        <td><a href="{grafanaUrl.OriginalString}">Grafana</a></td>
                        <td><a href="{appInsightsUrl.OriginalString}">Application Insights</a></td>
                    </tr>
                </tbody>
            </table>
            """;

        return mailBody;
    }

    private async Task SendToSlackAsync(
        string org,
        AltinnEnvironment environment,
        List<string> apps,
        string alertName,
        Uri grafanaUrl,
        Uri appInsightsUrl,
        Uri webhookUrl,
        CancellationToken cancellationToken
    )
    {
        string appsFormatted = string.Join(", ", apps.Select(a => $"`{a}`"));
        const string Emoji = ":x:";

        var links = new List<SlackText>
        {
            new() { Type = "mrkdwn", Text = $"<{grafanaUrl.OriginalString}|Grafana>" },
            new() { Type = "mrkdwn", Text = $"<{appInsightsUrl.OriginalString}|Application Insights>" },
        };

        var info = new List<SlackText>
        {
            new() { Type = "mrkdwn", Text = $"Organisasjon: `{org}`" },
            new() { Type = "mrkdwn", Text = $"Miljø: `{environment.Name}`" },
            new() { Type = "mrkdwn", Text = $"Applikasjoner: {appsFormatted}" },
        };

        if (!generalSettings.IsProd)
        {
            info.Add(new SlackText { Type = "mrkdwn", Text = $"Studio-miljø: `{generalSettings.OriginEnvironment}`" });
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
                new SlackBlock { Type = "context", Elements = info },
                new SlackBlock { Type = "context", Elements = links },
            ],
        };
        await slackClient.SendMessageAsync(webhookUrl, message, cancellationToken);
    }
}
