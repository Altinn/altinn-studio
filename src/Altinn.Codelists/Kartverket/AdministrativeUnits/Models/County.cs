using System.Text.Json.Serialization;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits.Models;

/// <summary>
/// Holds information about a county (fylke).
/// </summary>
public class County
{
    /// <summary>
    /// Initializes a new instance of the <see cref="County"/> class.
    /// </summary>
    public County(string number, string name)
    {
        Number = number;
        Name = name;
    }

    /// <summary>
    /// Unique identification number for the county.
    /// </summary>
    [JsonPropertyName("fylkesnummer")]
    public string Number { get; set; }

    /// <summary>
    /// The name of the county in Norwegian.
    /// </summary>
    [JsonPropertyName("fylkesnavn")]
    public string Name { get; set; }

    /// <summary>
    /// List of municipalities within the county
    /// </summary>
    [JsonPropertyName("kommuner")]
    public List<Municipality> Municipalities { get; set; } = new List<Municipality>();
}
