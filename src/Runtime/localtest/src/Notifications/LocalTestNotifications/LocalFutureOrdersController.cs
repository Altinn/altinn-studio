using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

using LocalTest.Configuration;

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace LocalTest.Notifications.LocalTestNotifications;

/// <summary>
/// A stand-in for Altinn Notifications' order chain API (<c>future/orders</c>) and its shipment status
/// (<c>future/shipment/{id}</c>). Unlike the rest of this emulation it is not copied from altinn-notifications: it
/// sends nothing, and only reports a status, so that an app can place an order and follow it up.
/// </summary>
/// <remarks>
/// A shipment has no status before its requested send time. After it, every channel the order asked for is
/// delivered, unless the order's text contains one of these markers, which pick another outcome:
/// <list type="bullet">
/// <item><c>localtest:failed</c>: the email bounces and the SMS goes to an invalid number.</item>
/// <item><c>localtest:reserved</c>: the recipient has reserved themselves against notifications.</item>
/// <item><c>localtest:pending</c>: the shipment never gets a final status.</item>
/// </list>
/// </remarks>
[ApiController]
public class LocalFutureOrdersController(IOptions<LocalPlatformSettings> settings) : ControllerBase
{
    private static readonly SemaphoreSlim _lock = new(1, 1);

    private static readonly JsonSerializerOptions _serializerOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    /// <summary>
    /// Registers an order chain: a notification and its reminders, one shipment each. A repeated idempotency id
    /// returns the order it registered first, as Notifications does.
    /// </summary>
    [HttpPost("notifications/api/v1/future/orders")]
    [Consumes("application/json")]
    [Produces("application/json")]
    public async Task<IActionResult> Post([FromBody] JsonObject request)
    {
        string? idempotencyId = request["idempotencyId"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(idempotencyId) || request["recipient"] is not JsonObject recipient)
        {
            return BadRequest("The order needs an idempotencyId and a recipient.");
        }

        await _lock.WaitAsync();
        try
        {
            FileInfo orderFile = OrderFile(idempotencyId);
            if (orderFile.Exists)
            {
                var existing = JsonSerializer.Deserialize<StoredOrder>(
                    await System.IO.File.ReadAllTextAsync(orderFile.FullName),
                    _serializerOptions
                )!;
                return Ok(existing.Response);
            }

            string text = request.ToJsonString();
            string outcome =
                text.Contains("localtest:failed", StringComparison.Ordinal) ? "failed"
                : text.Contains("localtest:reserved", StringComparison.Ordinal) ? "reserved"
                : text.Contains("localtest:pending", StringComparison.Ordinal) ? "pending"
                : "delivered";
            string[] channels = Channels(recipient);
            string? sendersReference = request["sendersReference"]?.GetValue<string>();

            var shipments = new List<StoredShipment>
            {
                new(Guid.NewGuid(), "Notification", sendersReference, SendTime(request), channels, outcome),
            };
            foreach (JsonNode? reminder in request["reminders"]?.AsArray() ?? [])
            {
                shipments.Add(
                    new(
                        Guid.NewGuid(),
                        "Reminder",
                        reminder?["sendersReference"]?.GetValue<string>(),
                        SendTime(reminder!),
                        reminder?["recipient"] is JsonObject reminderRecipient ? Channels(reminderRecipient) : channels,
                        outcome
                    )
                );
            }

            var response = new OrderResponse(
                Guid.NewGuid(),
                new ShipmentReference(shipments[0].ShipmentId, shipments[0].SendersReference),
                [.. shipments.Skip(1).Select(s => new ShipmentReference(s.ShipmentId, s.SendersReference))]
            );

            await Write(orderFile, new StoredOrder(response));
            foreach (StoredShipment shipment in shipments)
            {
                await Write(ShipmentFile(shipment.ShipmentId), shipment);
            }

            return Created($"notifications/api/v1/future/orders/{response.NotificationOrderId}", response);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <summary>
    /// The shipment's status, and each channel's once its requested send time has passed.
    /// </summary>
    [HttpGet("notifications/api/v1/future/shipment/{id:guid}")]
    [Produces("application/json")]
    public async Task<IActionResult> GetShipment(Guid id)
    {
        FileInfo file = ShipmentFile(id);
        if (!file.Exists)
        {
            return NotFound();
        }

        var shipment = JsonSerializer.Deserialize<StoredShipment>(
            await System.IO.File.ReadAllTextAsync(file.FullName),
            _serializerOptions
        )!;
        DateTimeOffset now = DateTimeOffset.UtcNow;

        string status;
        object[] recipients;
        if (now < shipment.RequestedSendTime)
        {
            status = "Order_Registered";
            recipients = [];
        }
        else
        {
            status = shipment.Outcome == "pending" ? "Order_Processing" : "Order_Completed";
            recipients =
            [
                .. shipment.Channels.Select(channel => new
                {
                    type = channel,
                    destination = channel == "Email" ? "localtest@altinn.no" : "+4799999999",
                    status = ChannelStatus(channel, shipment.Outcome),
                    lastUpdate = now,
                }),
            ];
        }

        return Ok(
            new
            {
                shipmentId = shipment.ShipmentId,
                sendersReference = shipment.SendersReference,
                type = shipment.Type,
                status,
                lastUpdate = now,
                recipients,
            }
        );
    }

    private static string ChannelStatus(string channel, string outcome) =>
        (channel, outcome) switch
        {
            ("Email", "failed") => "Email_Failed_Bounced",
            ("SMS", "failed") => "SMS_Failed_InvalidRecipient",
            (_, "reserved") => $"{channel}_Failed_RecipientReserved",
            ("Email", "pending") => "Email_New",
            ("SMS", "pending") => "SMS_New",
            _ => $"{channel}_Delivered",
        };

    /// <summary>
    /// The channels an order's recipient asked for: the channel schema of a person or organization, or the address
    /// given directly. A preferred channel counts as the one used.
    /// </summary>
    private static string[] Channels(JsonObject recipient)
    {
        if (recipient["recipientEmail"] is not null)
        {
            return ["Email"];
        }

        if (recipient["recipientSms"] is not null)
        {
            return ["SMS"];
        }

        string? schema = (recipient["recipientPerson"] ?? recipient["recipientOrganization"])?[
            "channelSchema"
        ]?.ToString();
        return schema switch
        {
            "Sms" or "SmsPreferred" => ["SMS"],
            "EmailAndSms" => ["Email", "SMS"],
            _ => ["Email"],
        };
    }

    private static DateTimeOffset SendTime(JsonNode order) =>
        order["requestedSendTime"]?.GetValue<DateTimeOffset>() ?? DateTimeOffset.UtcNow;

    private static async Task Write<T>(FileInfo file, T value)
    {
        file.Directory?.Create();
        await System.IO.File.WriteAllTextAsync(file.FullName, JsonSerializer.Serialize(value, _serializerOptions));
    }

    private FileInfo OrderFile(string idempotencyId) =>
        new(
            Path.Combine(
                StoragePath(),
                "future-orders",
                Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(idempotencyId))) + ".json"
            )
        );

    private FileInfo ShipmentFile(Guid shipmentId) =>
        new(Path.Combine(StoragePath(), "shipments", shipmentId + ".json"));

    private string StoragePath() =>
        settings.Value.LocalTestingStorageBasePath + settings.Value.NotificationsStorageFolder;

    private sealed record StoredOrder(OrderResponse Response);

    private sealed record StoredShipment(
        Guid ShipmentId,
        string Type,
        string? SendersReference,
        DateTimeOffset RequestedSendTime,
        string[] Channels,
        string Outcome
    );

    private sealed record OrderResponse(
        Guid NotificationOrderId,
        ShipmentReference Notification,
        ShipmentReference[] Reminders
    );

    private sealed record ShipmentReference(Guid ShipmentId, string? SendersReference);
}
