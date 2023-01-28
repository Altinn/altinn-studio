using System.Text.Json.Serialization;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits.Models;

/// <summary>
/// Holds information about a commune (kommune).
/// </summary>
public class Commune
{
    /// <summary>
    /// Initializes a new instance of the <see cref="Commune"/> class.
    /// </summary>
    public Commune(string number, string name, string nameInNorwegian)
    {
        Number = number;
        Name = name;
        NameInNorwegian = nameInNorwegian;
    }

    /// <summary>
    /// Unique identification number for the commune.
    /// </summary>
    [JsonPropertyName("kommunenummer")]
    public string Number { get; set; }

    /// <summary>
    /// The name of the commune in Norwegian or Sami.
    /// </summary>
    [JsonPropertyName("kommunenavn")]
    public string Name { get; set; }

    /// <summary>
    /// The name of the commune in Norwegian.
    /// </summary>
    [JsonPropertyName("kommunenavnNorsk")]
    public string NameInNorwegian { get; set; }
}
