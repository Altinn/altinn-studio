using System.Net;
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

    public async Task<SmsOrderResponse> Order(SmsNotification smsNotification, CancellationToken cancellationToken)
    {
        using var activity = _telemetry?.StartNotificationOrderActivity(_orderType);

        try
        {
            Models.ApplicationMetadata? application = _appMetadata.ApplicationMetadata;

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

            using var httpResponseMessage = await _httpClient.SendAsync(httpRequestMessage, cancellationToken);
            string? httpContent = null;
            try
            {
                httpContent = await httpResponseMessage.Content.ReadAsStringAsync(cancellationToken);
                if (!httpResponseMessage.IsSuccessStatusCode)
                    throw new HttpRequestException("Got error status code for SMS notification order");

                var orderResponse =
                    JsonSerializer.Deserialize<SmsOrderResponse>(httpContent)
                    ?? throw new JsonException("Couldn't deserialize SMS notification order response");

                _telemetry?.RecordNotificationOrder(_orderType, Telemetry.Notifications.OrderResult.Success);
                return orderResponse;
            }
            catch (Exception e)
            {
                throw OrderFailed(e, httpResponseMessage.StatusCode, httpResponseMessage.ReasonPhrase, httpContent);
            }
        }
        catch (Exception e) when (e is not SmsNotificationException)
        {
            throw OrderFailed(e, statusCode: null, reasonPhrase: null, content: null);
        }
    }

    private SmsNotificationException OrderFailed(
        Exception innerException,
        HttpStatusCode? statusCode,
        string? reasonPhrase,
        string? content
    )
    {
        var ex = new SmsNotificationException(
            $"Something went wrong when processing the SMS notification order",
            statusCode,
            reasonPhrase,
            content,
            innerException
        );
        _logger.LogError(ex, "Error when processing SMS notification order");

        _telemetry?.RecordNotificationOrder(_orderType, Telemetry.Notifications.OrderResult.Error);

        return ex;
    }
}
