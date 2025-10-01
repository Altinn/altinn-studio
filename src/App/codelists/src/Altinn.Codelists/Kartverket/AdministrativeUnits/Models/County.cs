using System.Text.Json.Serialization;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits.Models;

/// <summary>
/// Holds information about a county (fylke).
/// </summary>
public class County(string number, string name)
{
    /// <summary>
    /// Unique identification number for the county.
    /// </summary>
    [JsonPropertyName("fylkesnummer")]
    public string Number { get; set; } = number;

    /// <summary>
    /// The name of the county in Norwegian.
    /// </summary>
    [JsonPropertyName("fylkesnavn")]
    public string Name { get; set; } = name;

    /// <summary>
    /// List of municipalities within the county
    /// </summary>
    [JsonPropertyName("kommuner")]
    public List<Municipality> Municipalities { get; set; } = new List<Municipality>();
}
