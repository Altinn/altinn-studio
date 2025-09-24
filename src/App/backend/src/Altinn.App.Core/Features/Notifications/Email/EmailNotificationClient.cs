using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models.Notifications.Email;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Notifications.Email;

internal sealed class EmailNotificationClient : IEmailNotificationClient
{
    private static readonly Telemetry.Notifications.OrderType _orderType = Telemetry.Notifications.OrderType.Email;

    private readonly ILogger<EmailNotificationClient> _logger;
    private readonly HttpClient _httpClient;
    private readonly IAppMetadata _appMetadata;
    private readonly PlatformSettings _platformSettings;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly Telemetry? _telemetry;

    public EmailNotificationClient(
        ILogger<EmailNotificationClient> logger,
        HttpClient httpClient,
        IOptions<PlatformSettings> platformSettings,
        IAppMetadata appMetadata,
        IAccessTokenGenerator accessTokenGenerator,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _platformSettings = platformSettings.Value;
        _httpClient = httpClient;
        _appMetadata = appMetadata;
        _accessTokenGenerator = accessTokenGenerator;
        _telemetry = telemetry;
    }

    public async Task<EmailOrderResponse> Order(EmailNotification emailNotification, CancellationToken ct)
    {
        using var activity = _telemetry?.StartNotificationOrderActivity(_orderType);

        HttpResponseMessage? httpResponseMessage = null;
        string? httpContent = null;
        try
        {
            var application = await _appMetadata.GetApplicationMetadata();

            var uri = _platformSettings.ApiNotificationEndpoint.TrimEnd('/') + "/orders/email";
            var body = JsonSerializer.Serialize(emailNotification);

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(body, new MediaTypeHeaderValue("application/json")),
            };
            httpRequestMessage.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            httpRequestMessage.Headers.Add(
                Constants.General.PlatformAccessTokenHeaderName,
                _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App)
            );

            httpResponseMessage = await _httpClient.SendAsync(httpRequestMessage, ct);
            httpContent = await httpResponseMessage.Content.ReadAsStringAsync(ct);
            EmailOrderResponse? orderResponse;
            if (httpResponseMessage.IsSuccessStatusCode)
            {
                orderResponse = JsonSerializer.Deserialize<EmailOrderResponse>(httpContent);
                if (orderResponse is null)
                    throw new JsonException("Couldn't deserialize email notification order response.");

                _telemetry?.RecordNotificationOrder(_orderType, Telemetry.Notifications.OrderResult.Success);
            }
            else
            {
                throw new HttpRequestException("Got error status code for email notification order");
            }
            return orderResponse;
        }
        catch (Exception e)
        {
            var ex = new EmailNotificationException(
                $"Something went wrong when processing the email order",
                httpResponseMessage,
                httpContent,
                e
            );
            _logger.LogError(ex, "Error when processing email notification order");

            _telemetry?.RecordNotificationOrder(_orderType, Telemetry.Notifications.OrderResult.Error);

            throw ex;
        }
        finally
        {
            httpResponseMessage?.Dispose();
        }
    }
}
