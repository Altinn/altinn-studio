using System;
using System.Collections.Generic;
using System.Net;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification.Models;
using Altinn.Studio.Designer.TypedHttpClients.Slack;
using Microsoft.Extensions.Hosting;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class DeploymentNotificationPayload(
    string org,
    string environment,
    string app,
    string status,
    string buildId,
    Uri grafanaUrl,
    string? buildLogUrl,
    IHostEnvironment hostEnvironment
) : INotificationPayload
{
    private readonly string _title = $"❌ {status}";

    public string UniqueId => buildId;
    public string NotificationName => status;

    public string GetEmailSubject() => _title;

    public EmailContentType EmailContentType => EmailContentType.Html;

    public string GetEmailBody()
    {
        return $"""
            <h1>{WebUtility.HtmlEncode(_title)}</h1>
            <table cellpadding="4">
                <tbody>
                    <tr>
                        <td>Organisasjon:</td>
                        <td><b>{WebUtility.HtmlEncode(org)}</b></td>
                    </tr>
                    <tr>
                        <td>Miljø:</td>
                        <td><b>{WebUtility.HtmlEncode(environment)}</b></td>
                    </tr>
                    <tr>
                        <td>Applikasjon:</td>
                        <td><b>{WebUtility.HtmlEncode(app)}</b></td>
                    </tr>
                    {(!hostEnvironment.IsProduction() ? $"""
                        <tr>
                            <td>Studio-miljø:</td>
                            <td><b>{WebUtility.HtmlEncode(hostEnvironment.EnvironmentName)}</b></td>
                        </tr>
                    """ : "")}
                </tbody>
            </table>
            <table cellpadding="4">
                <tbody>
                    <tr>
                        <td><a href="{grafanaUrl.OriginalString}">Grafana</a></td>
                        {(buildLogUrl is not null ? $"""
                            <td><a href="{WebUtility.HtmlEncode(buildLogUrl)}">Build log</a></td>
                        """ : "")}
                    </tr>
                </tbody>
            </table>
            """;
    }

    public string GetSmsBody()
    {
        string studioMiljø = !hostEnvironment.IsProduction()
            ? $"\nStudio-miljø: {hostEnvironment.EnvironmentName}"
            : "";

        return $@"{status}

Organisasjon: {org}
Miljø: {environment}
Applikasjon: {app}{studioMiljø}";
    }

    public SlackMessage GetSlackMessage()
    {
        const string Emoji = ":x:";

        var info = new List<SlackText>
        {
            new() { Type = "mrkdwn", Text = $"Organisasjon: `{org}`" },
            new() { Type = "mrkdwn", Text = $"Miljø: `{environment}`" },
            new() { Type = "mrkdwn", Text = $"Applikasjon: `{app}`" },
        };

        if (!hostEnvironment.IsProduction())
        {
            info.Add(new SlackText { Type = "mrkdwn", Text = $"Studio-miljø: `{hostEnvironment.EnvironmentName}`" });
        }

        var links = new List<SlackText>
        {
            new() { Type = "mrkdwn", Text = $"<{grafanaUrl.OriginalString}|Grafana>" },
        };

        if (buildLogUrl is not null)
        {
            links.Add(new SlackText { Type = "mrkdwn", Text = $"<{buildLogUrl}|Bygglogg>" });
        }

        return new SlackMessage
        {
            Text = $"{Emoji} `{org}` - `{environment}` - `{app}` - *{status}*",
            Blocks =
            [
                new SlackBlock
                {
                    Type = "section",
                    Text = new SlackText { Type = "mrkdwn", Text = $"{Emoji} *{status}*" },
                },
                new SlackBlock { Type = "context", Elements = info },
                new SlackBlock { Type = "context", Elements = links },
            ],
        };
    }
}
