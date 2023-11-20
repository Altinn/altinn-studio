#nullable enable
using Altinn.Notifications.Core.Models.Address;

namespace Altinn.Notifications.Core.Models;

/// <summary>
/// Class representing a notification recipient
/// </summary>
public class Recipient
{
    /// <summary>
    /// Gets the recipient id
    /// </summary>
    public string RecipientId { get; set; } = string.Empty;

    /// <summary>
    /// Gets a list of address points for the recipient
    /// </summary>
    public List<IAddressPoint> AddressInfo { get; set; } = new List<IAddressPoint>();

    /// <summary>
    /// Initializes a new instance of the <see cref="Recipient"/> class.
    /// </summary>
    public Recipient(string recipientId, List<IAddressPoint> addressInfo)
    {
        RecipientId = recipientId;
        AddressInfo = addressInfo;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Recipient"/> class.
    /// </summary>
    public Recipient(List<IAddressPoint> addressInfo)
    {
        AddressInfo = addressInfo;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Recipient"/> class.
    /// </summary>
    public Recipient()
    {
    }
}
