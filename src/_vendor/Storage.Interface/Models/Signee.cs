using System;
using System.Text.Json.Serialization;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Information about the signee
/// </summary>
public class Signee
{
    /// <summary>
    /// The userId representing the signee.
    /// </summary>
    [JsonProperty(PropertyName = "userId")]
    [JsonPropertyName("userId")]
    public string? UserId { get; set; }

    /// <summary>
    /// The ID of the systemuser performing the signing
    /// </summary>
    [JsonProperty(PropertyName = "systemUserId")]
    [JsonPropertyName("systemUserId")]
    public Guid? SystemUserId { get; set; }

    /// <summary>
    /// The personNumber representing the signee.
    /// </summary>
    [JsonProperty(PropertyName = "personNumber")]
    [JsonPropertyName("personNumber")]
    public string? PersonNumber { get; set; }

    /// <summary>
    /// The organisationNumber representing the signee.
    /// </summary>
    [JsonProperty(PropertyName = "organisationNumber")]
    [JsonPropertyName("organisationNumber")]
    public string? OrganisationNumber { get; set; }
}
