namespace Altinn.Codelists.RestCountries.Models;

/// <summary>
/// Class for filtering countries.
/// </summary>
public class Filter
{
    /// <summary>
    /// Filter on region eg. Africa, Americas, Asia, Europe, Oceania
    /// </summary>
    public string? Region { get; set; }

    /// <summary>
    /// Filter on subregion eg. South America, Southern Europe, Central America, Eastern Asia, etc.
    /// </summary>
    public string? SubRegion { get; set; }
}
