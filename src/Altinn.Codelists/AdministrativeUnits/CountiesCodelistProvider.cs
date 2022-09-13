using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Models;
using Altinn.Codelists.AdministrativeUnits.Clients;

namespace Altinn.Codelists.AdministrativeUnits
{
    /// <summary>
    /// Provides a codelist for counties of Norway.
    /// </summary>
    public class CountiesCodelistProvider : IAppOptionsProvider
    {
        private readonly IAdministrativeUnitsClient _countiesHttpClient;

        /// <inheritdoc/>
        public string Id => "fylker";

        /// <summary>
        /// Initializes a new instance of the <see cref="CountiesCodelistProvider"/> class.
        /// </summary>
        public CountiesCodelistProvider(IAdministrativeUnitsClient countiesHttpClient)
        {
            _countiesHttpClient = countiesHttpClient;
        }

        /// <inheritdoc/>
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
