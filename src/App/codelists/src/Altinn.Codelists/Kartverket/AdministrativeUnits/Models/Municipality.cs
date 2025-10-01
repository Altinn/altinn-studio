using System.Text.Json.Serialization;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits.Models;

/// <summary>
/// Holds information about a municipality  (kommune).
/// </summary>
public class Municipality(string number, string name, string nameInNorwegian)
{
    /// <summary>
    /// Unique identification number for the municipality.
    /// </summary>
    [JsonPropertyName("kommunenummer")]
    public string Number { get; set; } = number;

    /// <summary>
    /// The name of the municipality in Norwegian or Sami.
    /// </summary>
    [JsonPropertyName("kommunenavn")]
    public string Name { get; set; } = name;

    /// <summary>
    /// The name of the municipality in Norwegian.
    /// </summary>
    [JsonPropertyName("kommunenavnNorsk")]
    public string NameInNorwegian { get; set; } = nameInNorwegian;
}
