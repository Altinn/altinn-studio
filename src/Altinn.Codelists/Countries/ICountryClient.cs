using Altinn.Codelists.Countries.Models;

namespace Altinn.Codelists
{
    /// <summary>
    /// Information on all countries of the world.
    /// </summary>
    public interface ICountryClient
    {
        /// <summary>
        /// Get all the countries of the world.
        /// </summary>
        Task<List<Country>> GetAllCountries();
    }
}