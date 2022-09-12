using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Models;
using Altinn.Codelists.AdministrativeUnits.Clients;
using Altinn.Codelists.AdministrativeUnits.Models;

namespace Altinn.Codelists.AdministrativeUnits
{
    public class CommunesCodelistProvider : IAppOptionsProvider
    {
        private readonly IAdministrativeUnitsClient _administrativeUnitsHttpClient;

        public string Id => "kommuner";

        public CommunesCodelistProvider(IAdministrativeUnitsClient administrativeUnitsHttpClient)
        {
            _administrativeUnitsHttpClient = administrativeUnitsHttpClient;
        }

        public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            bool hasCountyParam = keyValuePairs.TryGetValue("fnr", out string? countyNumber);

            List<Commune> communes = new();
            if (hasCountyParam && countyNumber != null)
            {
                communes = await _administrativeUnitsHttpClient.GetCommunes(countyNumber);
            }
            else
            {
                communes = await _administrativeUnitsHttpClient.GetCommunes();
            }
            

            var appOptions = new AppOptions()
            {
                Options = communes.Select(x => new AppOption() { Value = x.Number, Label = x.Name }).ToList()
            };

            return appOptions;
        }
    }
}
