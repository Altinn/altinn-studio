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
            if (!TryRead(request["requestedSendTime"], out DateTimeOffset? requestedSendTime))
            {
                return BadRequest("requestedSendTime must be a date and time, such as 2026-11-10T12:00:00Z.");
            }
            DateTimeOffset sendTime = requestedSendTime ?? DateTimeOffset.UtcNow;

            var shipments = new List<StoredShipment>
            {
                new(Guid.NewGuid(), "Notification", sendersReference, sendTime, channels, outcome),
            };
            var shipmentRecipients = new List<JsonObject> { recipient };
            foreach (JsonNode? reminder in request["reminders"]?.AsArray() ?? [])
            {
                if (ReminderSendTime(reminder, sendTime) is not { } reminderSendTime)
                {
                    return BadRequest(
                        "A reminder needs either delayDays, a number of days from 1, or requestedSendTime, a date and time, but not both."
                    );
                }

                JsonObject reminderRecipient = reminder?["recipient"] as JsonObject ?? recipient;
                shipments.Add(
                    new(
                        Guid.NewGuid(),
                        "Reminder",
                        reminder?["sendersReference"]?.GetValue<string>(),
                        reminderSendTime,
                        Channels(reminderRecipient),
                        outcome
                    )
                );
                shipmentRecipients.Add(reminderRecipient);
            }

            var response = new OrderResponse(
                Guid.NewGuid(),
                new ShipmentReference(shipments[0].ShipmentId, shipments[0].SendersReference),
                [.. shipments.Skip(1).Select(s => new ShipmentReference(s.ShipmentId, s.SendersReference))]
            );

            DateTimeOffset created = DateTimeOffset.UtcNow;
            for (int i = 0; i < shipments.Count; i++)
            {
                await Write(ShipmentFile(shipments[i].ShipmentId), shipments[i]);
                await Write(MessagesPageFile(shipments[i].ShipmentId), MessagesPageOrder(shipments[i], shipmentRecipients[i], created));
            }
            // Last, since a repeated idempotency id returns this order: it must not name shipments never written.
            await Write(orderFile, new StoredOrder(response));

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
    /// A recipient Notifications looks the address up for, which carries its own channel schema and texts. The other
    /// kinds of recipient are given by their address.
    /// </summary>
    private static JsonNode? Owner(JsonObject recipient) =>
        recipient["recipientPerson"] ?? recipient["recipientOrganization"] ?? recipient["recipientExternalIdentity"];

    /// <summary>
    /// The channels an order's recipient asked for: the channel schema of a person, organization or external
    /// identity, or the address given directly. A preferred channel counts as the one used.
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

        return ChannelSchema(Owner(recipient)) switch
        {
            "Sms" or "SmsPreferred" => ["SMS"],
            "EmailAndSms" => ["Email", "SMS"],
            _ => ["Email"],
        };
    }

    /// <summary>
    /// A shipment as the Messages page reads the orders of the older <c>orders/email</c> and <c>orders/sms</c>
    /// API, so that it lists the notification beside them, with its own send time when it is a reminder.
    /// </summary>
    private static object MessagesPageOrder(StoredShipment shipment, JsonObject recipient, DateTimeOffset created)
    {
        JsonNode? owner = Owner(recipient);
        string? address =
            recipient["recipientEmail"]?["emailAddress"]?.ToString() ?? recipient["recipientSms"]?["phoneNumber"]?.ToString();
        JsonNode? email = owner?["emailSettings"] ?? recipient["recipientEmail"]?["emailSettings"];
        JsonNode? sms = owner?["smsSettings"] ?? recipient["recipientSms"]?["smsSettings"];

        var templates = new List<object>();
        if (shipment.Channels.Contains("Email") && email is not null)
        {
            templates.Add(new { subject = email["subject"]?.ToString(), body = email["body"]?.ToString() });
        }
        if (shipment.Channels.Contains("SMS") && sms is not null)
        {
            templates.Add(new { body = sms["body"]?.ToString() });
        }

        return new
        {
            id = shipment.ShipmentId,
            created,
            requestedSendTime = shipment.RequestedSendTime,
            notificationChannel = ChannelSchema(owner) ?? shipment.Channels[0],
            sendersReference = shipment.SendersReference,
            resourceId = owner?["resourceId"]?.ToString(),
            recipients = new[]
            {
                new
                {
                    nationalIdentityNumber = owner?["nationalIdentityNumber"]?.ToString(),
                    organizationNumber = owner?["orgNumber"]?.ToString(),
                    externalIdentity = owner?["externalIdentity"]?.ToString(),
                    addressInfo = address is null ? [] : new[] { new { emailAddress = address } },
                },
            },
            templates,
        };
    }

    private static readonly string[] _channelSchemas = ["Email", "Sms", "EmailPreferred", "SmsPreferred", "EmailAndSms"];

    /// <summary>
    /// A recipient's channel schema by name. The app libraries send it as a number, which Notifications reads as the
    /// position in its <c>NotificationChannelExt</c>, so this does the same.
    /// </summary>
    private static string? ChannelSchema(JsonNode? owner) =>
        owner?["channelSchema"] switch
        {
            JsonValue value when value.TryGetValue(out int number) && number >= 0 && number < _channelSchemas.Length =>
                _channelSchemas[number],
            JsonNode node => node.ToString(),
            null => null,
        };

    /// <summary>
    /// When a reminder goes out, as Notifications works it out: <c>delayDays</c> counts from the order's send time,
    /// and <c>requestedSendTime</c> stands on its own. Notifications refuses a reminder with both, with neither, with
    /// less than a day's delay, or with a value of the wrong type, which is <c>null</c> here.
    /// </summary>
    private static DateTimeOffset? ReminderSendTime(JsonNode? reminder, DateTimeOffset orderSendTime) =>
        TryRead(reminder?["delayDays"], out int? delayDays)
        && TryRead(reminder?["requestedSendTime"], out DateTimeOffset? requestedSendTime)
            ? (delayDays, requestedSendTime) switch
            {
                (int days and >= 1, null) when days <= (DateTimeOffset.MaxValue - orderSendTime).TotalDays =>
                    orderSendTime.ToUniversalTime().AddDays(days),
                (null, DateTimeOffset sendTime) => sendTime,
                _ => null,
            }
            : null;

    /// <summary>
    /// Reads a property that may be left out. <c>false</c> when it is there but is not a <typeparamref name="T"/>.
    /// </summary>
    private static bool TryRead<T>(JsonNode? node, out T? value)
        where T : struct
    {
        value = node is JsonValue json && json.TryGetValue(out T read) ? read : null;
        return node is null || value is not null;
    }

    /// <summary>
    /// Writes the whole file under a temporary name first. A write cut short then cannot leave a truncated order that
    /// fails every retry, and the Messages page never reads a partly written one.
    /// </summary>
    private static async Task Write<T>(FileInfo file, T value)
    {
        file.Directory?.Create();
        string temporaryFile = $"{file.FullName}.{Guid.NewGuid():N}.tmp";
        try
        {
            await System.IO.File.WriteAllTextAsync(temporaryFile, JsonSerializer.Serialize(value, _serializerOptions));
            System.IO.File.Move(temporaryFile, file.FullName, overwrite: true);
        }
        finally
        {
            System.IO.File.Delete(temporaryFile);
        }
    }

    private FileInfo OrderFile(string idempotencyId) =>
        new(
            Path.Combine(
                StoragePath(),
                "future-orders",
                Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(idempotencyId))) + ".json"
            )
        );

    /// <summary>Where the Messages page reads orders from, one file per order.</summary>
    private FileInfo MessagesPageFile(Guid shipmentId) =>
        new(Path.Combine(StoragePath(), "orders", shipmentId + ".json"));

    private FileInfo ShipmentFile(Guid shipmentId) =>
        new(Path.Combine(StoragePath(), "shipments", shipmentId + ".json"));

    /// <summary>
    /// Joined as <see cref="LocalTest.Controllers.MessagesController"/> does, so the page reads where orders are written.
    /// </summary>
    private string StoragePath() =>
        Path.Join(settings.Value.LocalTestingStorageBasePath, settings.Value.NotificationsStorageFolder);

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
