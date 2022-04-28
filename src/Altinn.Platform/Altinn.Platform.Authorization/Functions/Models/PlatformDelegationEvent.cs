using System;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Authorization.Functions.Models;

/// <summary>
/// This is the model Altinn Bridge expects to receive an array of
/// </summary>
public class PlatformDelegationEvent
{
    /// <summary>
    /// Gets or sets the type of the event.
    /// </summary>
    /// <value>
    /// The type of the event.
    /// </value>
    [JsonPropertyName("eventType")]
    public DelegationChangeEventType EventType { get; set; }

    /// <summary>
    /// Gets or sets the policy change identifier.
    /// </summary>
    /// <value>
    /// The policy change identifier.
    /// </value>
    [JsonPropertyName("policyChangeId")]
    public int PolicyChangeId { get; set; }

    /// <summary>
    /// Gets or sets the Altinn app identifier.
    /// </summary>
    /// <value>
    /// The Altinn app identifier.
    /// </value>
    [JsonPropertyName("altinnAppId")]
    public string AltinnAppId { get; set; }

    /// <summary>
    /// Gets or sets the offered by party identifier.
    /// </summary>
    /// <value>
    /// The offered by party identifier.
    /// </value>
    [JsonPropertyName("offeredByPartyId")]
    public int OfferedByPartyId { get; set; }

    /// <summary>
    /// Gets or sets the covered by party identifier. If set, CoveredByUserId should be 0
    /// </summary>
    /// <value>
    /// The covered by party identifier.
    /// </value>
    [JsonPropertyName("coveredByPartyId")]
    public int CoveredByPartyId { get; set; }

    /// <summary>
    /// Gets or sets the covered by user identifier. If set, CoveredByPartyId should be 0
    /// </summary>
    /// <value>
    /// The covered by user identifier.
    /// </value>
    [JsonPropertyName("coveredByUserId")]
    public int CoveredByUserId { get; set; }

    /// <summary>
    /// Gets or sets the performed by user identifier.
    /// </summary>
    /// <value>
    /// The performed by user identifier.
    /// </value>
    [JsonPropertyName("performedByUserId")]
    public int PerformedByUserId { get; set; }

    /// <summary>
    /// Gets or sets the timestamp for when this delegation change was created.
    /// </summary>
    /// <value>
    /// The timestamp for the creation time.
    /// </value>
    [JsonPropertyName("created")]
    public DateTime Created { get; set; }
}
