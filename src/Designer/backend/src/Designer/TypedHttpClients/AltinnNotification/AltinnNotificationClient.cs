using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification.Models;
using Microsoft.Extensions.Hosting;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnNotification;

public class AltinnNotificationClient(
    HttpClient httpClient,
    IEnvironmentsService environmentsService,
    IHostEnvironment hostEnvironment,
    PlatformSettings platformSettings
) : IAltinnNotificationClient
{
    // Must be one of the predefined MailFrom addresses in Azure Communications Services
    private const string AltinnEmailSender = "noreply@altinn.no";

    // Either a phone number with country code prefix (no `x` or spaces), or up to 11 alphanumeric characters, see https://wiki.pswin.com/Gateway%20HTTP%20API.ashx#Sender_Number_SND_15
    private const string AltinnSmsSender = "Altinn";

    private readonly Lazy<Task<Uri>> _notificationOrderUri = new(async () =>
    {
        var baseUrl = hostEnvironment.IsProduction()
            ? await environmentsService.CreatePlatformUri("production")
            : await environmentsService.CreatePlatformUri("tt02");
        return new Uri($"{baseUrl}{platformSettings.ApiNotificationOrdersUri}");
    });

    public async Task SendEmailNotification(
        string idempotencyId,
        string emailAddress,
        string subject,
        string body,
        EmailContentType contentType = EmailContentType.Plain,
        SendingTime sendingTimePolicy = SendingTime.Anytime,
        CancellationToken cancellationToken = default
    )
    {
        var uri = await _notificationOrderUri.Value;
        using var response = await httpClient.PostAsync(
            uri,
            JsonContent.Create(
                NotificationOrder.Email(
                    idempotencyId,
                    AltinnEmailSender,
                    emailAddress,
                    subject,
                    body,
                    contentType,
                    sendingTimePolicy
                )
            ),
            cancellationToken
        );
        response.EnsureSuccessStatusCode();
    }

    // Phone number with country code prefix (no `+` or spaces), see https://wiki.pswin.com/Gateway%20HTTP%20API.ashx#Receiver_Number_RCV_14
    public async Task SendSmsNotification(
        string idempotencyId,
        string phoneNumber,
        string body,
        SendingTime sendingTimePolicy = SendingTime.Anytime,
        CancellationToken cancellationToken = default
    )
    {
        var uri = await _notificationOrderUri.Value;
        using var response = await httpClient.PostAsync(
            uri,
            JsonContent.Create(
                NotificationOrder.Sms(idempotencyId, AltinnSmsSender, phoneNumber, body, sendingTimePolicy)
            ),
            cancellationToken
        );
        response.EnsureSuccessStatusCode();
    }
}
