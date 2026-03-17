using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Signing;

/// <summary>
/// Represents a person who is a signee.
/// </summary>
public abstract class ProvidedSignee
{
    /// <summary>
    /// Communication configuration.
    /// </summary>
    [JsonPropertyName("communicationConfig")]
    public CommunicationConfig? CommunicationConfig { get; init; }

    /// <summary>
    /// Additional actions to delegate to this signee. Read and sign are always delegated by default.
    /// Use this to delegate additional actions, e.g. "reject". Custom action strings are also supported.
    /// </summary>
    [JsonPropertyName("additionalActionsToDelegate")]
    public List<string>? AdditionalActionsToDelegate { get; init; }
}

/// <summary>
/// Represents a signee that is a person.
/// </summary>
public class ProvidedPerson : ProvidedSignee
{
    /// <summary>
    /// The social security number.
    /// </summary>
    [JsonPropertyName("socialSecurityNumber")]
    public required string SocialSecurityNumber { get; init; }

    /// <summary>
    /// The full name of the signee. {FirstName} {LastName} or {FirstName} {MiddleName} {LastName}.
    /// </summary>
    [JsonPropertyName("fullName")]
    public required string FullName { get; init; }
}

/// <summary>
/// Represents a signee that is an organization.
/// </summary>
public class ProvidedOrganization : ProvidedSignee
{
    /// <summary>
    /// The name of the organization.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>
    /// The organization number.
    /// </summary>
    [JsonPropertyName("organizationNumber")]
    public required string OrganizationNumber { get; init; }
}
