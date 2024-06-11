using System.Text.Json.Serialization;

namespace Altinn.Notifications.Core.Models.Orders;

/// <summary>
/// A class representing an order request response.
/// </summary>
public class NotificationOrderRequestResponse
{
    /// <summary>
    /// The order id
    /// </summary>
    public Guid? OrderId { get; set; }

    /// <summary>
    /// The recipient lookup summary
    /// </summary>
    public RecipientLookupResult RecipientLookup { get; set; }
}

/// <summary>
/// Class describing a summary of recipient lookup for a notification order
/// </summary>
public class RecipientLookupResult
{
    /// <summary>
    /// The lookup status
    /// </summary>
    [JsonPropertyName("status")]
    public RecipientLookupStatus Status { get; set; }

    /// <summary>
    /// List of id numbers for the recipients that are reserved 
    /// </summary>
    [JsonPropertyName("isReserved")]
    public List<string> IsReserved { get; set; }

    /// <summary>
    /// List of id numbers for the recipients where no contact points were identified
    /// </summary>
    [JsonPropertyName("missingContact")]
    public List<string> MissingContact { get; set; }
}

/// <summary>
/// Enum describing the success rate for recipient lookup
/// </summary>
public enum RecipientLookupStatus
{
    /// <summary>
    /// The recipient lookup was successful for all recipients
    /// </summary>
    Success,

    /// <summary>
    /// The recipient lookup was successful for some recipients
    /// </summary>
    PartialSuccess,

    /// <summary>
    /// The recipient lookup failed for all recipients
    /// </summary>
    Failed
}
