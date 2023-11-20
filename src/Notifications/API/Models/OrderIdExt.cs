#nullable enable
using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models;

/// <summary>
/// A class representing a container for an order id.
/// </summary>
/// <remarks>
/// External representaion to be used in the API.
/// </remarks>
public class OrderIdExt
{
    /// <summary>
    /// The order id
    /// </summary>
    [JsonPropertyName("orderId")]
    public Guid OrderId { get; set; }

    /// <summary>
    /// Initializes a new instance of the <see cref="OrderIdExt"/> class.
    /// </summary>
    public OrderIdExt(Guid orderId)
    {
        OrderId = orderId;
    }
}
