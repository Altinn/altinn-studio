using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents a reference to another item in the Altinn ecosystem.
/// </summary>
public sealed record CorrespondenceExternalReference
{
    /// <summary>
    /// The reference type.
    /// </summary>
    [JsonPropertyName("referenceType")]
    public required CorrespondenceReferenceType ReferenceType { get; init; }

    /// <summary>
    /// The reference value.
    /// </summary>
    [JsonPropertyName("referenceValue")]
    public required string ReferenceValue { get; init; }
}
