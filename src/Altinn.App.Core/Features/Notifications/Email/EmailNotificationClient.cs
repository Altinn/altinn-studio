using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models.Notifications.Email;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.ApplicationInsights;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Altinn.App.Core.Features.Notifications.Email;

internal sealed class EmailNotificationClient : IEmailNotificationClient
{
    private readonly ILogger<EmailNotificationClient> _logger;
    private readonly HttpClient _httpClient;
    private readonly IAppMetadata _appMetadata;
    private readonly PlatformSettings _platformSettings;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly TelemetryClient? _telemetryClient;

    public EmailNotificationClient(
        ILogger<EmailNotificationClient> logger,
        HttpClient httpClient,
        IOptions<PlatformSettings> platformSettings,
        IAppMetadata appMetadata,
        IAccessTokenGenerator accessTokenGenerator,
        TelemetryClient? telemetryClient = null)
    {
        _logger = logger;
        _platformSettings = platformSettings.Value;
        _httpClient = httpClient;
        _appMetadata = appMetadata;
        _accessTokenGenerator = accessTokenGenerator;
        _telemetryClient = telemetryClient;
    }

    public async Task<EmailOrderResponse> Order(EmailNotification emailNotification, CancellationToken ct)
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
            var application = await _appMetadata.GetApplicationMetadata();

            var uri = _platformSettings.ApiNotificationEndpoint.TrimEnd('/') + "/orders/email";
            var body = JsonSerializer.Serialize(emailNotification);

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
            EmailOrderResponse? orderResponse;
            if (httpResponseMessage.IsSuccessStatusCode)
            {
                orderResponse = JsonSerializer.Deserialize<EmailOrderResponse>(httpContent);
                if (orderResponse is null)
                    throw new JsonException("Couldn't deserialize email notification order response.");

                Telemetry.OrderCount.WithLabels(Telemetry.Types.Email, Telemetry.Result.Success).Inc();
            }
            else
            {
                throw new HttpRequestException("Got error status code for email notification order");
            }
            return orderResponse;
        }
        catch (Exception e)
        {
            exception = e;
            Telemetry.OrderCount.WithLabels(Telemetry.Types.Email, Telemetry.Result.Error).Inc();
            var ex = new EmailNotificationException($"Something went wrong when processing the email order", httpResponseMessage, httpContent, e);
            _logger.LogError(ex, "Error when processing email notification order");
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
