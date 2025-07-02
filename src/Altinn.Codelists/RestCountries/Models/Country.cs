using System.Text.Json.Serialization;

namespace Altinn.Codelists.RestCountries.Models;

/// <summary>
/// Holds information of a country.
/// </summary>
public class Country(Name name)
{
    /// <summary>
    /// The name of the country (in english)
    /// </summary>
    [JsonPropertyName("name")]
    public Name Name { get; set; } = name;

    /// <summary>
    /// ISO 3166-1 alpha-2 – two-letter country codes which are the most widely used of the three,
    /// and used most prominently for the Internet's country code top-level domains (with a few exceptions).
    /// </summary>
    [JsonPropertyName("cca2")]
    public string CountryCodeAlpha2 { get; set; } = "";

    /// <summary>
    /// ISO 3166-1 alpha-3 – three-letter country codes which allow a better visual association
    /// between the codes and the country names than the alpha-2 codes.
    /// </summary>
    [JsonPropertyName("ccn3")]
    public string CountryCodeNumeric3 { get; set; } = "";

    /// <summary>
    /// ISO 3166-1 numeric – three-digit country codes which are identical to those developed and maintained
    /// by the United Nations Statistics Division, with the advantage of script (writing system) independence,
    /// and hence useful for people or systems using non-Latin scripts.
    /// </summary>
    [JsonPropertyName("cca3")]
    public string CountryCodeAlpha3 { get; set; } = "";

    /// <summary>
    /// ISO 3166-1 independence status (denotes the country is considered a sovereign state)
    /// </summary>
    [JsonPropertyName("independent")]
    public bool Independent { get; set; }

    /// <summary>
    /// ISO 3166-1 assignment status
    /// </summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = "";

    /// <summary>
    /// UN Member status
    /// </summary>
    [JsonPropertyName("unMember")]
    public bool UnitedNationsMember { get; set; }

    /// <summary>
    /// Emojii flag character
    /// </summary>
    [JsonPropertyName("flag")]
    public string EmojiFlag { get; set; } = "";

    /// <summary>
    /// Region (Africa, Americas, Antarctic, Asia, Europe, Oceania)
    /// </summary>
    [JsonPropertyName("region")]
    public string Region { get; set; } = "";

    /// <summary>
    /// Subregion
    /// </summary>
    [JsonPropertyName("subregion")]
    public string SubRegion { get; set; } = "";

    /// <summary>
    /// Official languages
    /// </summary>
    [JsonPropertyName("languages")]
    public Dictionary<string, string> Languages { get; set; } = new Dictionary<string, string>();

    /// <summary>
    /// Name of country translated to various languages.
    /// </summary>
    [JsonPropertyName("translations")]
    public Dictionary<string, Name> Translations { get; set; } = new Dictionary<string, Name>();

    /// <summary>
    /// Latitude and longitude
    /// </summary>
    [JsonPropertyName("latlng")]
    public decimal[] LatitudeLongitude { get; set; } = Array.Empty<decimal>();

    /// <summary>
    /// Top level domains
    /// </summary>
    [JsonPropertyName("tld")]
    public string[] TopLevelDomains { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Currencies used
    /// </summary>
    [JsonPropertyName("currencies")]
    public Dictionary<string, Currency> Currencies { get; set; } = new Dictionary<string, Currency>();
}
