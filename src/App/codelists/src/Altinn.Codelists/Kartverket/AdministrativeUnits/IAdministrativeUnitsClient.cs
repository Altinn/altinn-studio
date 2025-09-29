using Altinn.Codelists.Kartverket.AdministrativeUnits.Models;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits;

/// <summary>
/// Information on Norways offical administrative units for counties and municipalities.
/// </summary>
public interface IAdministrativeUnitsClient
{
    /// <summary>
    /// Get all the counties of Norway.
    /// </summary>
    public Task<List<County>> GetCounties();

    /// <summary>
    /// Get all the counties of Norway.
    /// </summary>
    public Task<List<Municipality>> GetMunicipalities();

    /// <summary>
    /// Get all the municipalities within the specified county.
    /// </summary>
    public Task<List<Municipality>> GetMunicipalities(string countyNumber);
}
