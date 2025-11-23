#nullable disable
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Represents the supported language in the text resource folder.
/// </summary>
public class ApplicationLanguage
{
    /// <summary>
    /// Gets or sets the language code. Should be a two letter ISO name
    /// Example: "nb"
    /// </summary>
    [JsonPropertyName("language")]
    public string Language { get; set; }
}
