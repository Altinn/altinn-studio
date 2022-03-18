using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Authorization.Functions.Models;

/// <summary>
/// The internal wrapper model for expressing a list of delegation change events sent from Altinn.Platform.Authorization
/// </summary>
public class DelegationChangeEventList
{
    /// <summary>
    /// Gets or sets the delegation change events.
    /// </summary>
    /// <value>
    /// The delegation change events.
    /// </value>
    [JsonPropertyName("l")]
    public List<DelegationChangeEvent> DelegationChangeEvents { get; set; }
}
