using Altinn.Codelists.Countries.Data;
using Altinn.Codelists.Countries.Models;
using Altinn.Codelists.Utilities;
using System.Text.Json;

namespace Altinn.Codelists
{
    public class CountriesClient : ICountryClient
    {
        public async Task<List<Country>> GetAllCountries()
        {
            string json = await EmbeddedResource.LoadDataAsString(Resources.CountriesJson);
            var countries = JsonSerializer.Deserialize<List<Country>>(json);

            if (countries == null)
            {
                countries = new List<Country>();
            }

            return countries;
        }
    }
}