using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Email;
using Altinn.App.Core.Models.Email;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.ApplicationInsights;
using Microsoft.Extensions.Options;
using Prometheus;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Altinn.App.Core.Infrastructure.Clients.Email;
/// <summary>
/// Implementation of the <see cref="IEmailNotificationClient"/> interface using a HttpClient to send
/// requests to the Email Notification service.
/// </summary>
public sealed class EmailNotificationClient : IEmailNotificationClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAppMetadata _appMetadata;
    private readonly PlatformSettings _platformSettings;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly TelemetryClient? _telemetryClient;
    private static readonly Counter _orderCount = Metrics
        .CreateCounter("altinn_app_notification_order_request_count", "Number of notification order requests.", labelNames: ["type", "result"]);

    /// <summary>
    /// Initializes a new instance of the <see cref="EmailNotificationClient"/> class.
    /// </summary>
    /// <param name="httpClientFactory"></param>
    /// <param name="platformSettings">Api endpoints for platform services.</param>
    /// <param name="appMetadata">The service providing appmetadata.</param>
    /// <param name="accessTokenGenerator">An access token generator to create an access token.</param>
    /// <param name="telemetryClient">Client used to track dependencies.</param>
    public EmailNotificationClient(
        IHttpClientFactory httpClientFactory,
        IOptions<PlatformSettings> platformSettings,
        IAppMetadata appMetadata,
        IAccessTokenGenerator accessTokenGenerator,
        TelemetryClient? telemetryClient = null)
    {
        _platformSettings = platformSettings.Value;
        _httpClientFactory = httpClientFactory;
        _appMetadata = appMetadata;
        _accessTokenGenerator = accessTokenGenerator;
        _telemetryClient = telemetryClient;
    }

    /// <inheritdoc/>
    /// <exception cref="EmailNotificationException"/>
    public async Task<EmailOrderResponse> Order(EmailNotification emailNotification, CancellationToken ct)
    {
        var startTime = DateTime.UtcNow;
        var timer = Stopwatch.StartNew();

        using var httpClient = _httpClientFactory.CreateClient();

        HttpResponseMessage? httpResponseMessage = null;
        string? httpContent = null;
        EmailOrderResponse? orderResponse = null;
        try
        {
            var application = await _appMetadata.GetApplicationMetadata();

            var uri = _platformSettings.NotificationEndpoint.TrimEnd('/') + "/api/v1/orders/email";
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

            httpResponseMessage = await httpClient.SendAsync(httpRequestMessage, ct);
            httpContent = await httpResponseMessage.Content.ReadAsStringAsync(ct);
            if (httpResponseMessage.IsSuccessStatusCode)
            {
                orderResponse = JsonSerializer.Deserialize<EmailOrderResponse>(httpContent);
                if (orderResponse is null)
                    throw new InvalidOperationException("Couldn't deserialize email notification order response.");

                _orderCount.WithLabels("email", "success").Inc();
            }
            else
            {
                throw new HttpRequestException("Got error status code for email notification order");
            }
            return orderResponse;
        }
        catch (Exception e)
        {
            _orderCount.WithLabels("email", "error").Inc();
            var ex = new EmailNotificationException($"Something went wrong when processing the email order. " +
                $"\nresponseContent: {httpContent}" +
                $"\nresponseStatusCode: {httpResponseMessage?.StatusCode}" +
                $"\nresponseReasonPhrase: {httpResponseMessage?.ReasonPhrase}", e);
            throw ex;
        }
        finally
        {
            httpResponseMessage?.Dispose();

            timer.Stop();
            _telemetryClient?.TrackDependency(
                "Altinn.Notifications",
                "OrderEmailNotification",
                "",
                startTime,
                timer.Elapsed,
                orderResponse is not null
            );
        }
    }
}
