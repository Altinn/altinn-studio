using Altinn.Codelists.Countries.Models;

namespace Altinn.Codelists
{
    public interface ICountryClient
    {
        Task<List<Country>> GetAllCountries();
    }
}