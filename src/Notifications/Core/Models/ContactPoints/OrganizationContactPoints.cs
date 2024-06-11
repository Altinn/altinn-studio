using System.Linq;

namespace Altinn.Notifications.Core.Models.ContactPoints;

/// <summary>
/// Class describing the contact points for an organization
/// </summary>
public class OrganizationContactPoints
{
    /// <summary>
    /// Gets or sets the organization number for the organization
    /// </summary>
    public string OrganizationNumber { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the party id of the organization
    /// </summary>
    public int PartyId { get; set; }

    /// <summary>
    /// Gets or sets a list of official mobile numbers
    /// </summary>
    public List<string> MobileNumberList { get; set; } = new();

    /// <summary>
    /// Gets or sets a list of official email addresses
    /// </summary>
    public List<string> EmailList { get; set; } = new();

    /// <summary>
    /// Gets or sets a list of user registered contact points associated with the organization.
    /// </summary>
    public List<UserContactPoints> UserContactPoints { get; set; } = new();

    /// <summary>
    /// Create a new instance with the same values as the existing instance
    /// </summary>
    /// <returns>The new instance with copied values.</returns>
    public OrganizationContactPoints CloneWithoutContactPoints()
    {
        OrganizationContactPoints clone = new()
        {
            OrganizationNumber = OrganizationNumber,
            PartyId = PartyId,
            MobileNumberList = new(),
            EmailList = new(),
            UserContactPoints = new()
        };

        return clone;
    }
}
