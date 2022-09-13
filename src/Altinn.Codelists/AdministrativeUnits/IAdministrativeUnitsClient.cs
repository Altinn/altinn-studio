using Altinn.Codelists.AdministrativeUnits.Models;

namespace Altinn.Codelists.AdministrativeUnits.Clients
{
    /// <summary>
    /// Information on Norways offical administrative units for counties and communes.
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
        public Task<List<Commune>> GetCommunes();

        /// <summary>
        /// Get all the communes within the specified county.
        /// </summary>
        public Task<List<Commune>> GetCommunes(string countyNumber);
    }
}
