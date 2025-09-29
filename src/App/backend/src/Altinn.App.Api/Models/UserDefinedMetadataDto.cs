#nullable disable
using System.Text.Json.Serialization;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Models;

/// <summary>
/// Represents the response from an API endpoint providing a list of key-value properties.
/// </summary>
public class UserDefinedMetadataDto
{
    /// <summary>
    /// A list of properties represented as key-value pairs.
    /// </summary>
    [JsonPropertyName("userDefinedMetadata")]
    public List<KeyValueEntry> UserDefinedMetadata { get; init; } = [];
}
