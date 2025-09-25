using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models.Notifications.Sms;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Notifications.Sms;

internal sealed class SmsNotificationClient : ISmsNotificationClient
{
    private static readonly Telemetry.Notifications.OrderType _orderType = Telemetry.Notifications.OrderType.Sms;

    private readonly ILogger<SmsNotificationClient> _logger;
    private readonly HttpClient _httpClient;
    private readonly PlatformSettings _platformSettings;
    private readonly IAppMetadata _appMetadata;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly Telemetry? _telemetry;

    public SmsNotificationClient(
        ILogger<SmsNotificationClient> logger,
        HttpClient httpClient,
        IOptions<PlatformSettings> platformSettings,
        IAppMetadata appMetadata,
        IAccessTokenGenerator accessTokenGenerator,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _httpClient = httpClient;
        _platformSettings = platformSettings.Value;
        _appMetadata = appMetadata;
        _accessTokenGenerator = accessTokenGenerator;
        _telemetry = telemetry;
    }

    public async Task<SmsOrderResponse> Order(SmsNotification smsNotification, CancellationToken ct)
    {
        using var activity = _telemetry?.StartNotificationOrderActivity(_orderType);

        HttpResponseMessage? httpResponseMessage = null;
        string? httpContent = null;
        try
        {
            Models.ApplicationMetadata? application = await _appMetadata.GetApplicationMetadata();

            var uri = _platformSettings.ApiNotificationEndpoint.TrimEnd('/') + "/orders/sms";
            var body = JsonSerializer.Serialize(smsNotification);

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

            if (httpResponseMessage.IsSuccessStatusCode)
            {
                SmsOrderResponse? orderResponse = JsonSerializer.Deserialize<SmsOrderResponse>(httpContent);
                if (orderResponse is null)
                    throw new JsonException("Couldn't deserialize SMS notification order response");

                _telemetry?.RecordNotificationOrder(_orderType, Telemetry.Notifications.OrderResult.Success);
                return orderResponse;
            }
            else
            {
                throw new HttpRequestException("Got error status code for SMS notification order");
            }
        }
        catch (Exception e)
        {
            var ex = new SmsNotificationException(
                $"Something went wrong when processing the SMS notification order",
                httpResponseMessage,
                httpContent,
                e
            );
            _logger.LogError(ex, "Error when processing SMS notification order");

            _telemetry?.RecordNotificationOrder(_orderType, Telemetry.Notifications.OrderResult.Error);

            throw ex;
        }
        finally
        {
            httpResponseMessage?.Dispose();
        }
    }
}
