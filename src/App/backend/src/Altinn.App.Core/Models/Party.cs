namespace Altinn.App.Core.Models;

/// <summary>
/// Represents a party.
/// </summary>
public record Party
{
    /// <summary>
    /// Gets or sets the party ID.
    /// </summary>
    public int PartyId { get; set; }

    /// <summary>
    /// Gets or sets the party UUID.
    /// </summary>
    public Guid? PartyUuid { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="Models.PartyType"/>.
    /// </summary>
    public PartyType PartyTypeName { get; set; }

    /// <summary>
    /// Gets or sets the organisation number, if the party is an organisation.
    /// </summary>
    public string? OrgNumber { get; set; }

    /// <summary>
    /// Gets or sets the social security number, if the party is a person.
    /// </summary>
    public string? SSN { get; set; }

    /// <summary>
    /// Gets or sets the unit type, if the party is an organisation.
    /// </summary>
    public string? UnitType { get; set; }

    /// <summary>
    /// Gets or sets the name of the party.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the party is deleted.
    /// </summary>
    public bool IsDeleted { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether this is the only hierarchy element with no access.
    /// </summary>
    public bool OnlyHierarchyElementWithNoAccess { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="Models.Person"/>, if the party is a person.
    /// </summary>
    public Person? Person { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="Models.Organization"/>, if the party is an organisation.
    /// </summary>
    public Organization? Organization { get; set; }

    /// <summary>
    /// Gets or sets the child parties of this party.
    /// </summary>
    public List<Party>? ChildParties { get; set; }

    /// <summary>
    /// Gets or sets when the party was last changed in Altinn.
    /// </summary>
    public DateTimeOffset? LastChangedInAltinn { get; set; }

    /// <summary>
    /// Gets or sets when the party was last changed in the external register.
    /// </summary>
    public DateTimeOffset? LastChangedInExternalRegister { get; set; }
}
