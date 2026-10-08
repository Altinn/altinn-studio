using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Notifications.Future;

internal sealed class NotificationOrderClient : INotificationOrderClient
{
    private readonly ILogger<NotificationOrderClient> _logger;
    private readonly HttpClient _httpClient;
    private readonly PlatformSettings _platformSettings;
    private readonly IAppMetadata _appMetadata;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly Telemetry? _telemetry;

    public NotificationOrderClient(
        ILogger<NotificationOrderClient> logger,
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

    public async Task<NotificationOrderResponse> Order(
        NotificationOrderRequest request,
        CancellationToken cancellationToken
    )
    {
        using var activity = _telemetry?.StartNotificationOrderActivity(Telemetry.Notifications.OrderType.Future);

        try
        {
            var application = _appMetadata.ApplicationMetadata;

            var uri = _platformSettings.ApiNotificationEndpoint.TrimEnd('/') + "/future/orders";
            var body = JsonSerializer.Serialize(request);

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
                {
                    throw new HttpRequestException(
                        $"Got error status code for notification order: {(int)httpResponseMessage.StatusCode}"
                    );
                }

                var orderResponse =
                    JsonSerializer.Deserialize<NotificationOrderResponse>(httpContent)
                    ?? throw new JsonException("Couldn't deserialize notification order response.");

                _telemetry?.RecordNotificationOrder(
                    Telemetry.Notifications.OrderType.Future,
                    Telemetry.Notifications.OrderResult.Success
                );
                return orderResponse;
            }
            catch (Exception e)
            {
                throw OrderFailed(e, httpResponseMessage.StatusCode, httpResponseMessage.ReasonPhrase, httpContent);
            }
        }
        catch (Exception e) when (e is not NotificationOrderException)
        {
            throw OrderFailed(e, statusCode: null, reasonPhrase: null, content: null);
        }
    }

    private NotificationOrderException OrderFailed(
        Exception innerException,
        HttpStatusCode? statusCode,
        string? reasonPhrase,
        string? content
    )
    {
        _telemetry?.RecordNotificationOrder(
            Telemetry.Notifications.OrderType.Future,
            Telemetry.Notifications.OrderResult.Error
        );

        var ex = new NotificationOrderException(
            $"Something went wrong when processing the notification order",
            statusCode,
            reasonPhrase,
            content,
            innerException
        );
        _logger.LogError(ex, "Error when processing notification order.");
        return ex;
    }
}
