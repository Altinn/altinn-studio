using System.Collections.Generic;
using System.Linq;
using System.Net;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification.Models;
using Altinn.Studio.Designer.TypedHttpClients.Slack;
using Microsoft.Extensions.Hosting;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class AlertNotificationPayload(
    string org,
    AltinnEnvironment environment,
    List<string> apps,
    Alert alert,
    IHostEnvironment hostEnvironment
) : INotificationPayload
{
    private readonly string _title = $"❌ {alert.Name}";
    private readonly string _appLabel = apps.Count == 1 ? "Applikasjon" : "Applikasjoner";

    public string UniqueId => alert.Id;
    public string NotificationName => alert.Name;

    public string GetEmailSubject() => _title;

    public EmailContentType EmailContentType => EmailContentType.Html;

    public string GetEmailBody()
    {
        string appsFormatted = string.Join(", ", apps.Select(a => $"<b>{WebUtility.HtmlEncode(a)}</b>"));

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
                        <td><b>{WebUtility.HtmlEncode(environment.Name)}</b></td>
                    </tr>
                    <tr>
                        <td>{_appLabel}:</td>
                        <td>{appsFormatted}</td>
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
                        <td><a href="{alert.Url.OriginalString}">Grafana</a></td>
                        <td><a href="{alert.LogsUrl.OriginalString}">Application Insights</a></td>
                    </tr>
                </tbody>
            </table>
            """;
    }

    public string GetSmsBody()
    {
        string appsFormatted = string.Join(", ", apps);
        string studioMiljø = !hostEnvironment.IsProduction()
            ? $"\nStudio-miljø: {hostEnvironment.EnvironmentName}"
            : "";

        return $@"{alert.Name}

Organisasjon: {org}
Miljø: {environment.Name}
{_appLabel}: {appsFormatted}{studioMiljø}";
    }

    public SlackMessage GetSlackMessage()
    {
        string appsFormatted = string.Join(", ", apps.Select(a => $"`{a}`"));
        const string Emoji = ":x:";

        var info = new List<SlackText>
        {
            new() { Type = "mrkdwn", Text = $"Organisasjon: `{org}`" },
            new() { Type = "mrkdwn", Text = $"Miljø: `{environment.Name}`" },
            new() { Type = "mrkdwn", Text = $"{_appLabel}: {appsFormatted}" },
        };

        if (!hostEnvironment.IsProduction())
        {
            info.Add(new SlackText { Type = "mrkdwn", Text = $"Studio-miljø: `{hostEnvironment.EnvironmentName}`" });
        }

        var links = new List<SlackText>
        {
            new() { Type = "mrkdwn", Text = $"<{alert.Url.OriginalString}|Grafana>" },
            new() { Type = "mrkdwn", Text = $"<{alert.LogsUrl.OriginalString}|Application Insights>" },
        };

        return new SlackMessage
        {
            Text = $"{Emoji} `{org}` - `{environment.Name}` - {appsFormatted} - *{alert.Name}*",
            Blocks =
            [
                new SlackBlock
                {
                    Type = "section",
                    Text = new SlackText { Type = "mrkdwn", Text = $"{Emoji} *{alert.Name}*" },
                },
                new SlackBlock { Type = "context", Elements = info },
                new SlackBlock { Type = "context", Elements = links },
            ],
        };
    }
}
