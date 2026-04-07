using System.Net.Http.Headers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models.Notifications.Order;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Notifications.Order;

internal sealed class NotificationCancelClient : INotificationCancelClient
{
    private readonly ILogger<NotificationCancelClient> _logger;
    private readonly HttpClient _httpClient;
    private readonly PlatformSettings _platformSettings;
    private readonly IAppMetadata _appMetadata;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly Telemetry? _telemetry;

    public NotificationCancelClient(
        ILogger<NotificationCancelClient> logger,
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

    public async Task Cancel(Guid notificationOrderId, CancellationToken ct)
    {
        using var activity = _telemetry?.StartNotificationOrderCancelActivity(notificationOrderId);

        HttpResponseMessage? httpResponseMessage = null;
        string? httpContent = null;
        try
        {
            var application = await _appMetadata.GetApplicationMetadata();

            var uri = _platformSettings.ApiNotificationEndpoint.TrimEnd('/') + $"/orders/{notificationOrderId}/cancel";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, uri);
            httpRequestMessage.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            httpRequestMessage.Headers.Add(
                Constants.General.PlatformAccessTokenHeaderName,
                _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App)
            );

            httpResponseMessage = await _httpClient.SendAsync(httpRequestMessage, ct);
            httpContent = await httpResponseMessage.Content.ReadAsStringAsync(ct);

            if (httpResponseMessage.IsSuccessStatusCode is false)
            {
                throw new HttpRequestException(
                    $"Got error status code for notification order cancellation: {(int)httpResponseMessage.StatusCode}"
                );
            }

            _telemetry?.RecordNotificationOrderCancel(Telemetry.Notifications.CancelResult.Success);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            _telemetry?.RecordNotificationOrderCancel(Telemetry.Notifications.CancelResult.Cancelled);
            throw;
        }
        catch (Exception e) when (e is not NotificationCancelException)
        {
            _telemetry?.RecordNotificationOrderCancel(Telemetry.Notifications.CancelResult.Error);

            var ex = new NotificationCancelException(
                $"Something went wrong when cancelling notification order {notificationOrderId}",
                httpResponseMessage,
                httpContent,
                e
            );
            _logger.LogError(ex, "Error when cancelling notification order");
            throw ex;
        }
        finally
        {
            httpResponseMessage?.Dispose();
        }
    }
}
