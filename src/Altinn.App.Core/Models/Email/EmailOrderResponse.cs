using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.Email;

/// <summary>
/// The response from the email notification API.
/// </summary>
public sealed record EmailOrderResponse
{
    /// <summary>
    /// The id of the email order.
    /// </summary>
    [JsonPropertyName("orderId")]
    public string OrderId { get; init; }
    /// <summary>
    /// Initializes the EmailOrderResponse class.
    /// </summary>
    /// <param name="orderId"><inheritdoc cref="OrderId"/>></param>
    public EmailOrderResponse(string orderId)
    {
        OrderId = orderId;
    }
}
