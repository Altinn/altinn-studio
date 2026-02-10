using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnNotification;

public class AltinnNotificationClient(
    HttpClient _httpClient,
    IEnvironmentsService _environmentsService,
    GeneralSettings _generalSettings,
    PlatformSettings _platformSettings
) : IAltinnNotificationClient
{
    // Must be one of the predefined MailFrom addresses in Azure Communications Services
    private const string AltinnEmailSender = "noreply@altinn.no";

    // Either a phone number with country code prefix (no `x` or spaces), or up to 11 alphanumeric characters, see https://wiki.pswin.com/Gateway%20HTTP%20API.ashx#Sender_Number_SND_15
    private const string AltinnSmsSender = "Altinn";

    public async Task SendEmailNotification(
        string idempotencyId,
        string emailAddress,
        string subject,
        string body,
        EmailContentType contentType = EmailContentType.Plain,
        SendingTime sendingTimePolicy = SendingTime.Anytime
    )
    {
        var uri = await CreateNotificationOrderUri();
        using var response = await _httpClient.PostAsync(
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
            )
        );
        response.EnsureSuccessStatusCode();
    }

    // Phone number with country code prefix (no `+` or spaces), see https://wiki.pswin.com/Gateway%20HTTP%20API.ashx#Receiver_Number_RCV_14
    public async Task SendSmsNotification(
        string idempotencyId,
        string phoneNumber,
        string body,
        SendingTime sendingTimePolicy = SendingTime.Anytime
    )
    {
        var uri = await CreateNotificationOrderUri();
        using var response = await _httpClient.PostAsync(
            uri,
            JsonContent.Create(
                NotificationOrder.Sms(
                    idempotencyId,
                    AltinnSmsSender,
                    phoneNumber,
                    body,
                    sendingTimePolicy
                )
            )
        );
        response.EnsureSuccessStatusCode();
    }

    private async Task<Uri> CreateNotificationOrderUri()
    {
        var baseUrl =
            _generalSettings.OriginEnvironment == "prod"
                ? await _environmentsService.CreatePlatformUri("production")
                : await _environmentsService.CreatePlatformUri("tt02");

        return new Uri($"{baseUrl}{_platformSettings.ApiNotificationOrdersUri}");
    }
}
