using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
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
using Altinn.Studio.Designer.TypedHttpClients.Slack;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class NotificationService(
    IContactPointsRepository contactPointsRepository,
    IAltinnNotificationClient altinnNotificationsClient,
    ISlackClient slackClient,
    AlertsSettings alertsSettings
) : INotificationService
{
    public async Task NotifyInternalAsync(
        string org,
        AltinnEnvironment environment,
        INotificationPayload payload,
        CancellationToken cancellationToken
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(NotificationService)}.{nameof(NotifyInternalAsync)}"
        );
        activity?.SetTag("org", org);
        activity?.SetTag("environment", environment.Name);
        activity?.SetTag("notification.name", payload.NotificationName);

        try
        {
            await slackClient.SendMessageAsync(
                alertsSettings.GetSlackWebhookUrl(environment),
                payload.GetSlackMessage(),
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
        INotificationPayload payload,
        CancellationToken cancellationToken
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(NotificationService)}.{nameof(NotifyServiceOwnersAsync)}"
        );
        activity?.SetTag("org", org);
        activity?.SetTag("environment", environment.Name);
        activity?.SetTag("notification.name", payload.NotificationName);

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
                    SendContactMethodAsync(contactPoint, method, payload, cancellationToken)
                )
            )
            .ToList();

        await Task.WhenAll(notificationTasks);
    }

    private async Task SendContactMethodAsync(
        ContactPointEntity contactPoint,
        ContactMethodEntity method,
        INotificationPayload payload,
        CancellationToken cancellationToken
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(NotificationService)}.{nameof(SendContactMethodAsync)}"
        );
        activity?.SetTag("contact_point.id", contactPoint.Id);
        activity?.SetTag("contact_method.type", method.MethodType.ToString());
        activity?.SetTag("notification.name", payload.NotificationName);

        try
        {
            string idempotencyKey = $"{contactPoint.Id}-{method.Id}-{payload.UniqueId}";
            switch (method.MethodType)
            {
                case ContactMethodType.Email:
                    await altinnNotificationsClient.SendEmailNotification(
                        idempotencyKey,
                        method.Value,
                        payload.GetEmailSubject(),
                        payload.GetEmailBody(),
                        payload.EmailContentType,
                        cancellationToken: cancellationToken
                    );
                    break;
                case ContactMethodType.Sms:
                    await altinnNotificationsClient.SendSmsNotification(
                        idempotencyKey,
                        method.Value,
                        payload.GetSmsBody(),
                        cancellationToken: cancellationToken
                    );
                    break;
                case ContactMethodType.Slack:
                    await slackClient.SendMessageAsync(
                        new Uri(method.Value),
                        payload.GetSlackMessage(),
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
}
