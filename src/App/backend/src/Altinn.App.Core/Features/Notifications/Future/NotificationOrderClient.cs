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

    public async Task<NotificationOrderResponse> Order(NotificationOrderRequest request, CancellationToken ct)
    {
        using var activity = _telemetry?.StartNotificationOrderActivity(Telemetry.Notifications.OrderType.Future);

        // Cannot use `using var` here — httpResponseMessage must be accessible in the catch block.
        // Disposed manually in finally instead.
        HttpResponseMessage? httpResponseMessage = null;
        string? httpContent = null;
        try
        {
            var application = await _appMetadata.GetApplicationMetadata();

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

            httpResponseMessage = await _httpClient.SendAsync(httpRequestMessage, ct);
            httpContent = await httpResponseMessage.Content.ReadAsStringAsync(ct);

            if (httpResponseMessage.IsSuccessStatusCode)
            {
                var orderResponse =
                    JsonSerializer.Deserialize<NotificationOrderResponse>(httpContent)
                    ?? throw new JsonException("Couldn't deserialize notification order response.");

                _telemetry?.RecordNotificationOrder(
                    Telemetry.Notifications.OrderType.Future,
                    Telemetry.Notifications.OrderResult.Success
                );
                return orderResponse;
            }

            throw new HttpRequestException(
                $"Got error status code for notification order: {(int)httpResponseMessage.StatusCode}"
            );
        }
        catch (Exception e) when (e is not NotificationOrderException)
        {
            _telemetry?.RecordNotificationOrder(
                Telemetry.Notifications.OrderType.Future,
                Telemetry.Notifications.OrderResult.Error
            );

            var ex = new NotificationOrderException(
                $"Something went wrong when processing the notification order",
                httpResponseMessage,
                httpContent,
                e
            );
            _logger.LogError(ex, "Error when processing notification order.");
            throw ex;
        }
        finally
        {
            httpResponseMessage?.Dispose();
        }
    }
}
