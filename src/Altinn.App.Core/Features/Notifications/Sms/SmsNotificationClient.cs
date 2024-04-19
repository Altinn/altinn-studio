using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models.Notifications.Sms;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.ApplicationInsights;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Notifications.Sms;

internal sealed class SmsNotificationClient : ISmsNotificationClient
{
    private readonly ILogger<SmsNotificationClient> _logger;
    private readonly HttpClient _httpClient;
    private readonly PlatformSettings _platformSettings;
    private readonly IAppMetadata _appMetadata;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly TelemetryClient? _telemetryClient;

    public SmsNotificationClient(
        ILogger<SmsNotificationClient> logger,
        HttpClient httpClient,
        IOptions<PlatformSettings> platformSettings,
        IAppMetadata appMetadata,
        IAccessTokenGenerator accessTokenGenerator,
        TelemetryClient? telemetryClient = null)
    {
        _logger = logger;
        _httpClient = httpClient;
        _platformSettings = platformSettings.Value;
        _appMetadata = appMetadata;
        _accessTokenGenerator = accessTokenGenerator;
        _telemetryClient = telemetryClient;
    }

    public async Task<SmsNotificationOrderResponse> Order(SmsNotification smsNotification, CancellationToken ct)
    {
        DateTime startDateTime = default;
        long startTimestamp = default;
        if (_telemetryClient is not null)
        {
            startDateTime = DateTime.UtcNow;
            startTimestamp = Stopwatch.GetTimestamp();
        }

        HttpResponseMessage? httpResponseMessage = null;
        string? httpContent = null;
        Exception? exception = null;

        try
        {
            Models.ApplicationMetadata? application = await _appMetadata.GetApplicationMetadata();

            var uri = _platformSettings.NotificationEndpoint.TrimEnd('/') + "/orders/sms";
            var body = JsonSerializer.Serialize(smsNotification);

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(body, new MediaTypeHeaderValue("application/json")),
            };
            httpRequestMessage.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            httpRequestMessage.Headers.Add(
                "PlatformAccessToken",
                _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App)
            );

            httpResponseMessage = await _httpClient.SendAsync(httpRequestMessage, ct);
            httpContent = await httpResponseMessage.Content.ReadAsStringAsync(ct);

            if (httpResponseMessage.IsSuccessStatusCode)
            {
                SmsNotificationOrderResponse? orderResponse = JsonSerializer.Deserialize<SmsNotificationOrderResponse>(httpContent);
                if (orderResponse is null)
                    throw new JsonException("Couldn't deserialize SMS notification order response");

                Telemetry.OrderCount.WithLabels(Telemetry.Types.Sms, Telemetry.Result.Success).Inc();
                return orderResponse;
            }
            else
            {
                throw new HttpRequestException("Got error status code for SMS notification order");
            }
        }
        catch (Exception e)
        {
            exception = e;
            Telemetry.OrderCount.WithLabels(Telemetry.Types.Sms, Telemetry.Result.Error).Inc();
            var ex = new SmsNotificationException($"Something went wrong when processing the SMS notification order", httpResponseMessage, httpContent, e);
            _logger.LogError(ex, "Error when processing SMS notification order");
            throw ex;
        }
        finally
        {
            httpResponseMessage?.Dispose();
            if (_telemetryClient is not null)
            {
                var stopTimestamp = Stopwatch.GetTimestamp();
                var elapsed = Stopwatch.GetElapsedTime(startTimestamp, stopTimestamp);

                _telemetryClient.TrackDependency(
                    Telemetry.Dependency.TypeName,
                    Telemetry.Dependency.Name,
                    null,
                    startDateTime,
                    elapsed,
                    exception is null
                );
            }
        }
    }
}
