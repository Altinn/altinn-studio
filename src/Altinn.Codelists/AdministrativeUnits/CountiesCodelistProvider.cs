using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Models;
using Altinn.Codelists.AdministrativeUnits.Clients;

namespace Altinn.Codelists.AdministrativeUnits
{
    public class CountiesCodelistProvider : IAppOptionsProvider
    {
        private readonly IAdministrativeUnitsClient _countiesHttpClient;

        public string Id => "fylker";

        public CountiesCodelistProvider(IAdministrativeUnitsClient countiesHttpClient)
        {
            _countiesHttpClient = countiesHttpClient;
        }

        public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            var counties = await _countiesHttpClient.GetCounties();

            var appOptions = new AppOptions()
            {
                Options = counties.Select(x => new AppOption() { Value = x.Number, Label = x.Name }).ToList()
            };

            return appOptions;
        }
    }
}
