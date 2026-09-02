using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models;

/// <summary>
/// Represents a party.
/// </summary>
/// <remarks>
/// Vendored to match the shape of the actively-maintained <c>Altinn.Register.Contracts.V1.Party</c> (the
/// replacement for the discontinued <c>Altinn.Platform.Models</c> package), rather than referenced as a
/// NuGet package — see the remarks on <see cref="ChildParties"/> for why. Compared to the old, deprecated
/// <c>Altinn.Platform.Register.Models.Party</c>: <see cref="PartyUuid"/>, <see cref="ExternalUrn"/>,
/// <see cref="LastChangedInAltinn"/>, and <see cref="LastChangedInExternalRegister"/> are new fields, and
/// every string property is now properly nullable (the old type predated nullable reference types) —
/// except <see cref="Name"/>, which, along with <see cref="PartyId"/> and <see cref="PartyUuid"/>, is
/// <see langword="required"/> (Register always populates these; see
/// <see href="https://github.com/Altinn/altinn-register/pull/962">altinn-register#962</see>).
/// </remarks>
public record Party
{
    /// <summary>
    /// Gets or sets the party ID.
    /// </summary>
    [JsonPropertyName("partyId")]
    public required int PartyId { get; set; }

    /// <summary>
    /// Gets or sets the party UUID.
    /// </summary>
    [JsonPropertyName("partyUuid")]
    public required Guid PartyUuid { get; set; }

    /// <summary>
    /// Gets or sets the external URN reference of the party (e.g. a person identifier, organization
    /// identifier, or system user UUID URN), as the raw URN string.
    /// </summary>
    [JsonPropertyName("externalUrn")]
    public string? ExternalUrn { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="Models.PartyType"/>.
    /// </summary>
    [JsonPropertyName("partyTypeName")]
    public PartyType PartyTypeName { get; set; }

    /// <summary>
    /// Gets or sets the organization number, if the party is an organization.
    /// </summary>
    [JsonPropertyName("orgNumber")]
    public string? OrgNumber { get; set; }

    /// <summary>
    /// Gets or sets the social security number, if the party is a person.
    /// </summary>
    [JsonPropertyName("ssn")]
    public string? SSN { get; set; }

    /// <summary>
    /// Gets or sets the unit type, if the party is an organization.
    /// </summary>
    [JsonPropertyName("unitType")]
    public string? UnitType { get; set; }

    /// <summary>
    /// Gets or sets the name of the party.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the party is deleted.
    /// </summary>
    [JsonPropertyName("isDeleted")]
    public bool IsDeleted { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether this is the only hierarchy element with no access.
    /// </summary>
    [JsonPropertyName("onlyHierarchyElementWithNoAccess")]
    public bool OnlyHierarchyElementWithNoAccess { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="Models.Person"/>, if the party is a person.
    /// </summary>
    [JsonPropertyName("person")]
    public Person? Person { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="Models.Organization"/>, if the party is an organization.
    /// </summary>
    [JsonPropertyName("organization")]
    public Organization? Organization { get; set; }

    /// <summary>
    /// Gets or sets the child parties of this party.
    /// </summary>
    /// <remarks>
    /// This is <see cref="List{T}"/>, not <see cref="IReadOnlyList{T}"/> like the upstream
    /// <c>Altinn.Register.Contracts.V1.Party</c> — matching the shape of the original, pre-migration
    /// <c>Altinn.Platform.Register.Models.Party</c>. This API's XML content negotiation is backed by
    /// <see cref="System.Xml.Serialization.XmlSerializer"/>, which requires a settable/addable collection
    /// type and cannot serialize <see cref="IReadOnlyList{T}"/>; keeping <see cref="List{T}"/> here is
    /// what lets the endpoints that return a <see cref="Party"/> keep supporting XML.
    /// </remarks>
    [JsonPropertyName("childParties")]
    public List<Party>? ChildParties { get; set; }

    /// <summary>
    /// Gets or sets when the party was last changed in Altinn.
    /// </summary>
    [JsonPropertyName("lastChangedInAltinn")]
    public DateTimeOffset? LastChangedInAltinn { get; set; }

    /// <summary>
    /// Gets or sets when the party was last changed in the external register.
    /// </summary>
    [JsonPropertyName("lastChangedInExternalRegister")]
    public DateTimeOffset? LastChangedInExternalRegister { get; set; }
}
