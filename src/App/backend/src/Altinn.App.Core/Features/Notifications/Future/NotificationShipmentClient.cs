using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Notifications.Future;

/// <summary>
/// Reads what became of a shipment Altinn Notifications was asked to send. Notifications never tells the sender, so
/// the only way to learn whether a notification arrived is to ask.
/// </summary>
internal interface INotificationShipmentClient
{
    /// <summary>
    /// The shipment's status and each recipient's, from <c>GET future/shipment/{id}</c>.
    /// </summary>
    Task<NotificationShipmentStatus> GetShipment(Guid shipmentId, CancellationToken cancellationToken);
}

internal sealed class NotificationShipmentClient : INotificationShipmentClient
{
    private readonly HttpClient _httpClient;
    private readonly PlatformSettings _platformSettings;
    private readonly IAppMetadata _appMetadata;
    private readonly IAccessTokenGenerator _accessTokenGenerator;

    public NotificationShipmentClient(
        HttpClient httpClient,
        IOptions<PlatformSettings> platformSettings,
        IAppMetadata appMetadata,
        IAccessTokenGenerator accessTokenGenerator
    )
    {
        _httpClient = httpClient;
        _platformSettings = platformSettings.Value;
        _appMetadata = appMetadata;
        _accessTokenGenerator = accessTokenGenerator;
    }

    public async Task<NotificationShipmentStatus> GetShipment(Guid shipmentId, CancellationToken cancellationToken)
    {
        var application = _appMetadata.ApplicationMetadata;
        var uri = $"{_platformSettings.ApiNotificationEndpoint.TrimEnd('/')}/future/shipment/{shipmentId}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);
        httpRequestMessage.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpRequestMessage.Headers.Add(
            Constants.General.PlatformAccessTokenHeaderName,
            _accessTokenGenerator.GenerateAccessToken(application.Org, application.AppIdentifier.App)
        );

        using var httpResponseMessage = await _httpClient.SendAsync(httpRequestMessage, cancellationToken);
        string content = await httpResponseMessage.Content.ReadAsStringAsync(cancellationToken);
        if (!httpResponseMessage.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"Got error status code {(int)httpResponseMessage.StatusCode} reading notification shipment {shipmentId}: {content}",
                inner: null,
                httpResponseMessage.StatusCode
            );
        }

        return JsonSerializer.Deserialize<NotificationShipmentStatus>(content)
            ?? throw new JsonException($"Couldn't deserialize notification shipment {shipmentId}.");
    }
}

/// <summary>
/// A shipment as Altinn Notifications reports it. Statuses are kept as the strings Notifications sends (for example
/// <c>Order_Completed</c> or <c>Email_Failed_Bounced</c>), so a status it adds later still reads instead of failing
/// deserialization.
/// </summary>
internal sealed record NotificationShipmentStatus
{
    [JsonPropertyName("shipmentId")]
    public Guid ShipmentId { get; init; }

    [JsonPropertyName("status")]
    public required string Status { get; init; }

    [JsonPropertyName("recipients")]
    public IReadOnlyList<NotificationShipmentRecipient> Recipients { get; init; } = [];
}

/// <summary>
/// One recipient of a shipment: an email address or a mobile number, and what became of the notification sent there.
/// </summary>
internal sealed record NotificationShipmentRecipient
{
    [JsonPropertyName("type")]
    public string? Type { get; init; }

    [JsonPropertyName("destination")]
    public string? Destination { get; init; }

    [JsonPropertyName("status")]
    public required string Status { get; init; }
}
