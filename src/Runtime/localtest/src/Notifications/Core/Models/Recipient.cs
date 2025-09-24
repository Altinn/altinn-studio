using System.Text.Json;

using Altinn.Notifications.Core.Models.Address;

namespace Altinn.Notifications.Core.Models;

/// <summary>
/// Class representing a notification recipient
/// </summary>
public class Recipient
{
    /// <summary>
    /// Gets the recipient's organization number
    /// </summary>
    public string? OrganizationNumber { get; set; } = null;

    /// <summary>
    /// Gets the recipient's national identity number
    /// </summary>
    public string? NationalIdentityNumber { get; set; } = null;

    /// <summary>
    /// Gets or sets a value indicating whether the recipient is reserved from digital communication
    /// </summary>
    public bool? IsReserved { get; set; }

    /// <summary>
    /// Gets a list of address points for the recipient
    /// </summary>
    public List<IAddressPoint> AddressInfo { get; set; } = new List<IAddressPoint>();

    /// <summary>
    /// Initializes a new instance of the <see cref="Recipient"/> class.
    /// </summary>
    public Recipient(List<IAddressPoint> addressInfo, string? organizationNumber = null, string? nationalIdentityNumber = null)
    {
        OrganizationNumber = organizationNumber;
        NationalIdentityNumber = nationalIdentityNumber;
        AddressInfo = addressInfo;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Recipient"/> class.
    /// </summary>
    public Recipient()
    {
    }

    /// <summary>
    /// Creates a deep copy of the recipient object
    /// </summary>
    internal Recipient DeepCopy()
    {
        string json = JsonSerializer.Serialize(this);
        return JsonSerializer.Deserialize<Recipient>(json)!;
    }
}
