namespace Altinn.Notifications.Core.Models.Recipients;

/// <summary>
/// Class representing an sms recipient
/// </summary>
public class SmsRecipient
{
    /// <summary>
    /// Gets or sets the recipient's organization number
    /// </summary>
    public string? OrganizationNumber { get; set; } = null;

    /// <summary>
    /// Gets or sets the recipient's national identity number
    /// </summary>
    public string? NationalIdentityNumber { get; set; } = null;

    /// <summary>
    /// Gets or sets the mobile number
    /// </summary>
    public string MobileNumber { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether the recipient is reserved from digital communication
    /// </summary>
    public bool? IsReserved { get; set; }
}
