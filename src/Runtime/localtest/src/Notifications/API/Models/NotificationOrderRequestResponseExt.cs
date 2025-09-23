using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models;

/// <summary>
/// A class representing a container for an order id.
/// </summary>
/// <remarks>
/// External representaion to be used in the API.
/// </remarks>
public class NotificationOrderRequestResponseExt
{
    /// <summary>
    /// The order id
    /// </summary>
    [JsonPropertyName("orderId")]
    public Guid? OrderId { get; set; }

    /// <summary>
    /// The recipient lookup summary
    /// </summary>
    [JsonPropertyName("recipientLookup")]
    public RecipientLookupResultExt? RecipientLookup { get; set; }
}
