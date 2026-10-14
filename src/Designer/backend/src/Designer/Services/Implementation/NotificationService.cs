using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Exceptions.Notifications;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.ContactPoint;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification.Models;
using Altinn.Studio.Designer.TypedHttpClients.Slack;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class NotificationService(
    IContactPointsRepository contactPointsRepository,
    IAltinnNotificationClient altinnNotificationsClient,
    ISlackClient slackClient,
    AlertsSettings alertsSettings
) : INotificationService
{
    private const int SlackSectionTextLimit = 3000;
    private const string EmptyCellPlaceholder = "–";
    private const string EmailTableHeaderStyle = "text-align: left; border-bottom: 2px solid #999";
    private const string EmailTableCellStyle = "border-bottom: 1px solid #ddd";

    // A character outside the GSM 03.38 alphabet makes the whole SMS UCS-2 encoded, which fits 67 instead of 153
    // characters in each billed segment. These are the ones our own formatting produces: the en dash in ranges and
    // the no-break spaces that Norwegian number formatting uses as group separators.
    private static readonly IReadOnlyDictionary<char, char> s_gsmReplacements = new Dictionary<char, char>
    {
        ['\u2013'] = '-',
        ['\u00A0'] = ' ',
        ['\u202F'] = ' ',
    };

    public async Task NotifyInternalAsync(
        string org,
        AltinnEnvironment environment,
        NotificationPayload payload,
        CancellationToken cancellationToken
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(NotificationService)}.{nameof(NotifyInternalAsync)}"
        );
        activity?.SetTag(ServiceTelemetry.Attributes.Notification.Title, payload.Title);

        try
        {
            await slackClient.SendMessageAsync(
                alertsSettings.GetSlackWebhookUrl(environment),
                FormatSlackMessage(payload),
                cancellationToken
            );
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error, "Failed to send internal Slack notification.");
            activity?.AddException(ex);
        }
    }

    public async Task NotifyServiceOwnersAsync(
        string org,
        AltinnEnvironment environment,
        NotificationPayload payload,
        CancellationToken cancellationToken
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(NotificationService)}.{nameof(NotifyServiceOwnersAsync)}"
        );
        activity?.SetTag(ServiceTelemetry.Attributes.Notification.Title, payload.Title);

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
            activity?.SetStatus(ActivityStatusCode.Error, "Failed to retrieve contact points.");
            activity?.AddException(ex);
            return;
        }

        List<Task<bool>> notificationTasks = contactPoints
            .SelectMany(contactPoint =>
                contactPoint.Methods.Select(method =>
                    SendContactMethodAsync(contactPoint, method, payload, cancellationToken)
                )
            )
            .ToList();

        await Task.WhenAll(notificationTasks);
    }

    public async Task NotifyReportContactPointsAsync(
        string org,
        AltinnEnvironment environment,
        ReportFrequency frequency,
        NotificationPayload payload,
        CancellationToken cancellationToken
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(NotificationService)}.{nameof(NotifyReportContactPointsAsync)}"
        );
        activity?.SetTag(ServiceTelemetry.Attributes.Notification.Title, payload.Title);

        IReadOnlyList<ContactPointEntity> contactPoints =
            await contactPointsRepository.GetActiveReportContactPointsAsync(org, environment.Name, cancellationToken);

        bool[] deliveries = await Task.WhenAll(
            contactPoints
                .Where(cp => cp.ReportFrequency == frequency)
                .SelectMany(contactPoint =>
                    contactPoint.Methods.Select(method =>
                        SendContactMethodAsync(contactPoint, method, payload, cancellationToken)
                    )
                )
        );

        int failedCount = deliveries.Count(delivered => !delivered);
        activity?.SetTag(ServiceTelemetry.Attributes.Notification.DeliveryCount, deliveries.Length);
        activity?.SetTag(ServiceTelemetry.Attributes.Notification.DeliveryFailedCount, failedCount);
        if (failedCount > 0)
        {
            var exception = new NotificationDeliveryException(failedCount, deliveries.Length);
            activity?.SetStatus(ActivityStatusCode.Error, exception.Message);
            throw exception;
        }
    }

    /// <returns>Whether the notification was delivered.</returns>
    private async Task<bool> SendContactMethodAsync(
        ContactPointEntity contactPoint,
        ContactMethodEntity method,
        NotificationPayload payload,
        CancellationToken cancellationToken
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(NotificationService)}.{nameof(SendContactMethodAsync)}"
        );
        activity?.SetTag(ServiceTelemetry.Attributes.Notification.Title, payload.Title);
        activity?.SetTag(ServiceTelemetry.Attributes.Notification.ContactPointId, contactPoint.Id);
        activity?.SetTag(ServiceTelemetry.Attributes.Notification.ContactMethodType, method.MethodType.ToString());

        try
        {
            string idempotencyKey = $"{contactPoint.Id}-{method.Id}-{payload.Id}";

            switch (method.MethodType)
            {
                case ContactMethodType.Email:
                    await altinnNotificationsClient.SendEmailNotification(
                        idempotencyKey,
                        method.Value,
                        FormatTitle(payload),
                        FormatEmailBody(payload),
                        EmailContentType.Html,
                        cancellationToken: cancellationToken
                    );
                    break;
                case ContactMethodType.Sms:
                    await altinnNotificationsClient.SendSmsNotification(
                        idempotencyKey,
                        method.Value,
                        FormatSmsBody(payload),
                        cancellationToken: cancellationToken
                    );
                    break;
                case ContactMethodType.Slack:
                    await slackClient.SendMessageAsync(
                        new Uri(method.Value),
                        FormatSlackMessage(payload),
                        cancellationToken
                    );
                    break;
            }
            return true;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error, "Failed to send notification.");
            activity?.AddException(ex);
            return false;
        }
    }

    private static string FormatEmailBody(NotificationPayload payload)
    {
        string title = FormatTitle(payload);
        string body = string.IsNullOrWhiteSpace(payload.Body)
            ? ""
            : $"<pre style=\"font-family: sans-serif; white-space: pre-wrap\">{WebUtility.HtmlEncode(payload.Body)}</pre>";
        return $"""
            <h1>{WebUtility.HtmlEncode(title)}</h1>
            <table cellpadding="4">
                <tbody>
                    {string.Join("\n",
                        payload.Fields.Select(f =>
                            $"<tr><td>{WebUtility.HtmlEncode(f.Label)}:</td><td><b>{WebUtility.HtmlEncode(f.Value)}</b></td></tr>"
                        )
                    )}
                </tbody>
            </table>
            {body}
            {FormatEmailTable(payload.Table)}
            <table cellpadding="4">
                <tbody>
                <tr>
                    {string.Join("\n",
                        payload.Links.Select(l =>
                            $"<td><a href=\"{WebUtility.HtmlEncode(l.Url)}\">{WebUtility.HtmlEncode(l.Label)}</a></td>"
                        )
                    )}
                </tr>
                </tbody>
            </table>
            """;
    }

    private static string FormatEmailTable(NotificationTable? table)
    {
        if (table is null)
        {
            return "";
        }

        string headerCells = string.Concat(
            table.Headers.Select(header =>
                $"<th style=\"{EmailTableHeaderStyle}\">{WebUtility.HtmlEncode(header)}</th>"
            )
        );
        IEnumerable<string> rows = table.Rows.Select(row =>
            "<tr>"
            + string.Concat(
                row.Select(cell =>
                    $"<td style=\"{EmailTableCellStyle}\">{WebUtility.HtmlEncode(string.IsNullOrEmpty(cell) ? EmptyCellPlaceholder : cell)}</td>"
                )
            )
            + "</tr>"
        );
        return $"""
            <table cellpadding="6" cellspacing="0" style="border-collapse: collapse">
                <thead><tr>{headerCells}</tr></thead>
                <tbody>
                    {string.Join("\n", rows)}
                </tbody>
            </table>
            """;
    }

    // SMS leaves out the table: one block per row makes a long message that is billed per segment, so a sender
    // that attaches a table summarizes it in the body.
    private static string FormatSmsBody(NotificationPayload payload)
    {
        string fields = string.Join("\n", payload.Fields.Select(f => $"{f.Label}: {f.Value}"));
        string body = string.IsNullOrWhiteSpace(payload.Body) ? "" : $"\n\n{payload.Body}";
        return ToGsmCharacters($"{payload.Title}\n\n{fields}{body}");
    }

    private static string ToGsmCharacters(string text) =>
        string.Concat(text.Select(character => s_gsmReplacements.GetValueOrDefault(character, character)));

    private static SlackMessage FormatSlackMessage(NotificationPayload payload)
    {
        var infoElements = payload
            .Fields.Select(f => new SlackText { Type = "mrkdwn", Text = $"{f.Label}: `{f.Value}`" })
            .ToList();

        var linkElements = payload
            .Links.Select(l => new SlackText { Type = "mrkdwn", Text = $"<{l.Url}|{l.Label}>" })
            .ToList();

        string fallbackValues = string.Join(" - ", payload.Fields.Select(f => $"`{f.Value}`"));
        string titlePrefix = string.IsNullOrWhiteSpace(payload.Emoji) ? "" : $"{payload.Emoji} ";
        var blocks = new List<SlackBlock>
        {
            new()
            {
                Type = "section",
                Text = new SlackText { Type = "mrkdwn", Text = $"{titlePrefix}*{payload.Title}*" },
            },
            new() { Type = "context", Elements = infoElements },
        };

        string table = string.Join("\n\n", FormatSlackTableRows(payload.Table));
        blocks.AddRange(
            SplitSlackSections(payload.Body)
                .Concat(SplitSlackSections(table))
                .Select(section => new SlackBlock
                {
                    Type = "section",
                    Text = new SlackText { Type = "mrkdwn", Text = section },
                })
        );
        if (linkElements.Count > 0)
        {
            blocks.Add(new SlackBlock { Type = "context", Elements = linkElements });
        }

        return new SlackMessage { Text = $"{titlePrefix}{fallbackValues} - *{payload.Title}*", Blocks = blocks };
    }

    // Renders each table row as a block of text: the row name in bold followed by one line per non-empty cell.
    private static IEnumerable<string> FormatSlackTableRows(NotificationTable? table)
    {
        if (table is null)
        {
            yield break;
        }

        foreach (IReadOnlyList<string?> row in table.Rows)
        {
            IEnumerable<string> cells = table
                .Headers.Zip(row)
                .Skip(1)
                .Where(cell => !string.IsNullOrEmpty(cell.Second))
                .Select(cell => $"• {cell.First}: `{cell.Second}`");
            yield return string.Join("\n", cells.Prepend($"*{(row.Count > 0 ? row[0] : "")}*"));
        }
    }

    private static string FormatTitle(NotificationPayload payload) =>
        string.IsNullOrWhiteSpace(payload.Emoji) ? payload.Title : $"{payload.Emoji} {payload.Title}";

    private static IEnumerable<string> SplitSlackSections(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            yield break;
        }

        var section = new StringBuilder();
        foreach (string line in body.Split('\n'))
        {
            if (section.Length > 0 && section.Length + line.Length + 1 > SlackSectionTextLimit)
            {
                yield return section.ToString();
                section.Clear();
            }

            if (line.Length <= SlackSectionTextLimit)
            {
                if (section.Length > 0)
                {
                    section.Append('\n');
                }
                section.Append(line);
                continue;
            }

            for (int offset = 0; offset < line.Length; offset += SlackSectionTextLimit)
            {
                if (section.Length > 0)
                {
                    yield return section.ToString();
                    section.Clear();
                }
                yield return line.Substring(offset, Math.Min(SlackSectionTextLimit, line.Length - offset));
            }
        }

        if (section.Length > 0)
        {
            yield return section.ToString();
        }
    }
}
