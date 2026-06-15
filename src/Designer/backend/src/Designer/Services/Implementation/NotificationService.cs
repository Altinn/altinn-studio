using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
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
        activity?.SetTag("title", payload.Title);
        activity?.SetTag("org", org);
        activity?.SetTag("environment", environment.Name);

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
        activity?.SetTag("title", payload.Title);
        activity?.SetTag("org", org);
        activity?.SetTag("environment", environment.Name);

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

        List<Task> notificationTasks = contactPoints
            .SelectMany(contactPoint =>
                contactPoint.Methods.Select(method =>
                    SendContactMethodAsync(contactPoint, method, payload, null, cancellationToken)
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
        byte[]? pdfBytes,
        CancellationToken cancellationToken
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(NotificationService)}.{nameof(NotifyReportContactPointsAsync)}"
        );
        activity?.SetTag("title", payload.Title);
        activity?.SetTag("org", org);
        activity?.SetTag("environment", environment.Name);
        activity?.SetTag("frequency", frequency.ToString());

        IReadOnlyList<ContactPointEntity> contactPoints;
        try
        {
            contactPoints = await contactPointsRepository.GetActiveReportContactPointsAsync(
                org,
                environment.Name,
                cancellationToken
            );
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error, "Failed to retrieve report contact points.");
            activity?.AddException(ex);
            return;
        }

        List<Task> notificationTasks = contactPoints
            .Where(cp => cp.ReportFrequency == frequency)
            .SelectMany(contactPoint =>
                contactPoint.Methods.Select(method =>
                    SendContactMethodAsync(contactPoint, method, payload, pdfBytes, cancellationToken)
                )
            )
            .ToList();

        await Task.WhenAll(notificationTasks);
    }

    private async Task SendContactMethodAsync(
        ContactPointEntity contactPoint,
        ContactMethodEntity method,
        NotificationPayload payload,
        byte[]? pdfBytes,
        CancellationToken cancellationToken
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(NotificationService)}.{nameof(SendContactMethodAsync)}"
        );
        activity?.SetTag("title", payload.Title);
        activity?.SetTag("contact_point.id", contactPoint.Id);
        activity?.SetTag("contact_method.type", method.MethodType.ToString());

        try
        {
            string idempotencyKey = $"{contactPoint.Id}-{method.Id}-{payload.Id}";

            switch (method.MethodType)
            {
                case ContactMethodType.Email:
                    IReadOnlyList<EmailAttachment>? attachments = pdfBytes is not null
                        ?
                        [
                            new EmailAttachment
                            {
                                Filename = $"{payload.Id}.pdf",
                                Data = Convert.ToBase64String(pdfBytes),
                            },
                        ]
                        : null;
                    await altinnNotificationsClient.SendEmailNotification(
                        idempotencyKey,
                        method.Value,
                        FormatTitle(payload),
                        FormatEmailBody(payload),
                        EmailContentType.Html,
                        attachments: attachments,
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
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error, "Failed to send notification.");
            activity?.AddException(ex);
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

    private static string FormatSmsBody(NotificationPayload payload)
    {
        string fields = string.Join("\n", payload.Fields.Select(f => $"{f.Label}: {f.Value}"));
        string body = string.IsNullOrWhiteSpace(payload.Body) ? "" : $"\n\n{payload.Body}";
        return $"{payload.Title}\n\n{fields}{body}";
    }

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

        blocks.AddRange(
            SplitSlackSections(payload.Body)
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
