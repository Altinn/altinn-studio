#nullable enable
namespace Altinn.Notifications.Core.Models.Recipients;

/// <summary>
/// Class representing an email recipient
/// </summary>
public class EmailRecipient
{
    /// <summary>
    /// Gets or sets the recipient id
    /// </summary>
    public string? RecipientId { get; set; } = null;

    /// <summary>
    /// Gets or sets the toaddress
    /// </summary>
    public string ToAddress { get; set; } = string.Empty;
}
