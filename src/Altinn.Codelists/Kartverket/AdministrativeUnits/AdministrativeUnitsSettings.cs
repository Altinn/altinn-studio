using Altinn.Codelists.Kartverket.AdministrativeUnits.Clients;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits;

/// <summary>
/// Options to control the behavior of <see cref="AdministrativeUnitsHttpClient"/>
/// </summary>
public class AdministrativeUnitsSettings
{
    /// <summary>
    /// Base url to the api endpoint for information on administrative units.
    /// </summary>
    public string BaseApiUrl { get; set; } = "https://ws.geonorge.no/kommuneinfo/v1/";
}
