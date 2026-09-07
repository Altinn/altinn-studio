using System.Text.Json.Serialization;

namespace Altinn.Codelists.RestCountries.Models;

/// <summary>
/// Holds information of a currency used within a country.
/// </summary>
public class Currency(string name, string symbol)
{
    /// <summary>
    /// The name of the currency e.g. Norwegian krone, United States dollar, Pound sterling
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = name;

    /// <summary>
    /// The symbol used to identify the currency eg. kr, $, £
    /// </summary>
    [JsonPropertyName("symbol")]
    public string Symbol { get; set; } = symbol;
}
