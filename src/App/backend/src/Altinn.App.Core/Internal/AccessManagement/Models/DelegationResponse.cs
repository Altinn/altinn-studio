using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.AccessManagement.Models.Shared;

namespace Altinn.App.Core.Internal.AccessManagement.Models;

/// <summary>
/// Represents a response to a delegation request.
/// </summary>
public sealed class DelegationResponse
{
    /// <summary>
    /// Gets or sets the delegator.
    /// </summary>
    [JsonPropertyName("from")]
    public DelegationParty? Delegator { get; set; }

    /// <summary>
    /// Gets or sets the delegatee.
    /// </summary>
    [JsonPropertyName("to")]
    public DelegationParty? Delegatee { get; set; }

    /// <summary>
    /// Gets or sets the resource id.
    /// </summary>
    [JsonPropertyName("resourceId")]
    public string? ResourceId { get; set; }

    /// <summary>
    /// Gets or sets the instance id.
    /// </summary>
    [JsonPropertyName("instanceId")]
    public string? InstanceId { get; set; }

    /// <summary>
    /// Gets or sets the rights.
    /// </summary>
    [JsonPropertyName("rights")]
    public List<RightResponse> Rights { get; set; } = [];
}

/// <summary>
/// Represents the rights to delegate.
/// </summary>
public sealed class RightResponse
{
    /// <summary>
    /// Gets or sets the resource.
    /// </summary>
    [JsonPropertyName("resource")]
    public List<Resource> Resource { get; set; } = [];

    /// <summary>
    /// Gets or sets the action.
    /// </summary>
    [JsonPropertyName("action")]
    public AltinnAction? Action { get; set; }

    /// <summary>
    /// Gets or sets the status.
    /// </summary>
    [JsonPropertyName("status")]
    public string? Status { get; set; }
}
