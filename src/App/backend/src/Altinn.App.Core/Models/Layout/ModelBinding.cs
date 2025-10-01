using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.Layout;

/// <summary>
/// Wrapper type for a model binding with optional data type specification
/// </summary>
public readonly record struct ModelBinding
{
    /// <summary>
    /// The field in the model the binding is for
    /// </summary>
    [JsonPropertyName("field")]
    public required string Field { get; init; }

    /// <summary>
    /// The data type the binding refers to (default model for layout if null)
    /// </summary>
    [JsonPropertyName("dataType")]
    public string? DataType { get; init; }
}
