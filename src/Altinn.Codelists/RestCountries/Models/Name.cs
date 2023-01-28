using System.Text.Json.Serialization;

namespace Altinn.Codelists.RestCountries.Models;

/// <summary>
/// Holds information about the name of a country.
/// </summary>
public class Name
{
    /// <summary>
    /// Initializes a new instance of the <see cref="Name"/> class.
    /// </summary>
    public Name(string common, string official)
    {
        Common = common;
        Official = official;
    }

    /// <summary>
    /// The common name
    /// </summary>
    [JsonPropertyName("common")]
    public string Common { get; set; }

    /// <summary>
    /// The official name
    /// </summary>
    [JsonPropertyName("official")]
    public string Official { get; set; }
}