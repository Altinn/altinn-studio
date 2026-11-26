using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Payment;

/// <summary>
/// A message to an open payment attempt. The handler asks the payment processor itself and trusts nothing in it
/// beyond its kind and, for Nets, the event name.
/// </summary>
internal sealed record PaymentAttemptMessage
{
    public const string NetsEventKind = "netsEvent";
    public const string CancelKind = "cancel";
    public const string CheckKind = "check";

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary><see cref="NetsEventKind"/>, <see cref="CancelKind"/> or <see cref="CheckKind"/>.</summary>
    public required string Kind { get; init; }

    /// <summary>The Nets event name, for <see cref="NetsEventKind"/>.</summary>
    public string? Event { get; init; }

    public static string NetsEvent(string eventName) =>
        JsonSerializer.Serialize(
            new PaymentAttemptMessage { Kind = NetsEventKind, Event = eventName },
            _jsonSerializerOptions
        );

    public static string Cancel { get; } =
        JsonSerializer.Serialize(new PaymentAttemptMessage { Kind = CancelKind }, _jsonSerializerOptions);

    public static string Check { get; } =
        JsonSerializer.Serialize(new PaymentAttemptMessage { Kind = CheckKind }, _jsonSerializerOptions);

    /// <summary>The message in <paramref name="payload"/>, or null when it is not one.</summary>
    public static PaymentAttemptMessage? Parse(string payload)
    {
        try
        {
            return JsonSerializer.Deserialize<PaymentAttemptMessage>(payload, _jsonSerializerOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
