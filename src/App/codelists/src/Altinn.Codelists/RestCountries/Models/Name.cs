using System.Text.Json.Serialization;

namespace Altinn.Codelists.RestCountries.Models;

/// <summary>
/// Holds information about the name of a country.
/// </summary>
public class Name(string common, string official)
{
    /// <summary>
    /// The common name
    /// </summary>
    [JsonPropertyName("common")]
    public string Common { get; set; } = common;

    /// <summary>
    /// The official name
    /// </summary>
    [JsonPropertyName("official")]
    public string Official { get; set; } = official;
}
