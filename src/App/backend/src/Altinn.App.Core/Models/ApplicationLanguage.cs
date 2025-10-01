using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models;

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
#nullable disable
    public string Language { get; set; }
#nullable restore
}
