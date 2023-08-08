#nullable enable
using System.Text.Json.Serialization;

namespace Altinn.App.Api.Models;

/// <summary>
/// Model for process next body
/// </summary>
public class ProcessNext
{
    /// <summary>
    /// Action performed
    /// </summary>
    [JsonPropertyName("action")]
    public string? Action { get; set; }
}