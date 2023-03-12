using System.Text.Json.Serialization;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits.Models;

/// <summary>
/// Holds information about a municipality  (kommune).
/// </summary>
public class Municipality
{
    /// <summary>
    /// Initializes a new instance of the <see cref="Municipality"/> class.
    /// </summary>
    public Municipality(string number, string name, string nameInNorwegian)
    {
        Number = number;
        Name = name;
        NameInNorwegian = nameInNorwegian;
    }

    /// <summary>
    /// Unique identification number for the municipality.
    /// </summary>
    [JsonPropertyName("kommunenummer")]
    public string Number { get; set; }

    /// <summary>
    /// The name of the municipality in Norwegian or Sami.
    /// </summary>
    [JsonPropertyName("kommunenavn")]
    public string Name { get; set; }

    /// <summary>
    /// The name of the municipality in Norwegian.
    /// </summary>
    [JsonPropertyName("kommunenavnNorsk")]
    public string NameInNorwegian { get; set; }
}
