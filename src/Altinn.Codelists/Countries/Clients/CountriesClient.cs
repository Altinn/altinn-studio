using Altinn.Codelists.Countries.Data;
using Altinn.Codelists.Countries.Models;
using Altinn.Codelists.Utilities;
using System.Text.Json;

namespace Altinn.Codelists
{
    /// <summary>
    /// Client to get information on all countries of the world.
    /// Note that this is not an http client but uses a static json embedded within
    /// this dll to resolve the the list of countries.
    /// </summary>
    public class CountriesClient : ICountryClient
    {
        /// <summary>
        /// Sends a asynchronus internal request to get all the countries of the world.
        /// </summary>
        public async Task<List<Country>> GetAllCountries()
        {
            string json = await EmbeddedResource.LoadDataAsString(Resources.CountriesJson);
            var countries = JsonSerializer.Deserialize<List<Country>>(json);

            countries ??= new List<Country>();

            return countries;
        }
    }
}