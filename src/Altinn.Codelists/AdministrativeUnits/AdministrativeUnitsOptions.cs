namespace Altinn.Codelists.AdministrativeUnits
{
    /// <summary>
    /// Options to control the behavior of <see cref="AdministrativeUnitsHttpClient"/>
    /// </summary>
    public class AdministrativeUnitsOptions
    {
        /// <summary>
        /// Base url to the api endpoint for information on administrative units.
        /// </summary>
        public string BaseApiUrl { get; set; } = "https://ws.geonorge.no/kommuneinfo/v1/";
    }
}
