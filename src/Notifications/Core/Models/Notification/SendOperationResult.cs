#nullable enable
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Notifications.Core.Enums;
using Altinn.Notifications.Core.Models.Orders;

namespace Altinn.Notifications.Core.Models.Notification;

/// <summary>
/// A class representing a send operation update object
/// </summary>
public class SendOperationResult
{
    /// <summary>
    /// The notification id
    /// </summary>
    public Guid NotificationId { get; set; }

    /// <summary>
    /// The send operation id
    /// </summary>
    public string OperationId { get; set; } = string.Empty;

    /// <summary>
    /// The email send result
    /// </summary>
    public EmailNotificationResultType? SendResult { get; set; }

    /// <summary>
    /// Json serializes the <see cref="SendOperationResult"/>
    /// </summary>
    public string Serialize()
    {
        return JsonSerializer.Serialize(
            this,
            new JsonSerializerOptions
            {
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                Converters = { new JsonStringEnumConverter() }
            });
    }

    /// <summary>
    /// Deserialize a json string into the <see cref="SendOperationResult"/>
    /// </summary>
    public static SendOperationResult? Deserialize(string serializedString)
    {
        return JsonSerializer.Deserialize<SendOperationResult>(
            serializedString,
            new JsonSerializerOptions()
            {
                PropertyNameCaseInsensitive = true,
                Converters = { new JsonStringEnumConverter() }
            });
    }

    /// <summary>
    /// Try to parse a json string into a<see cref="SendOperationResult"/>
    /// </summary>
    public static bool TryParse(string input, out SendOperationResult value)
    {
        SendOperationResult? parsedOutput;
        value = new SendOperationResult();

        if (string.IsNullOrEmpty(input))
        {
            return false;
        }

        try
        {
            parsedOutput = Deserialize(input!);

            value = parsedOutput!;
            return value.NotificationId != Guid.Empty;
        }
        catch
        {
            // try parse, we simply return false if fails
        }

        return false;
    }
}
