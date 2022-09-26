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
        Task<List<Country>> GetCountries();

        /// <summary>
        /// Get all countries matching the provided filters.
        /// Values within the same filter object are AND'ed, while
        /// values between filter objects are OR'ed.
        /// </summary>
        Task<List<Country>> GetCountries(IEnumerable<Filter> filters);
    }
}