using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Models;

namespace App.IntegrationTests.Mocks.Apps.Ttd.EndringAvNavn.Options
{
    public class CarbrandsAppOptionsProvider : IAppOptionsProvider
    {
        public string Id => "carbrands";

        private readonly IAppOptionsFileHandler _appOptionsFileHandler;

        public CarbrandsAppOptionsProvider(IAppOptionsFileHandler appOptionsFileHandler)
        {
            _appOptionsFileHandler = appOptionsFileHandler;
        }

        public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            var appOptions = new AppOptions();
            appOptions.Options = await _appOptionsFileHandler.ReadOptionsFromFileAsync(Id);

            appOptions.Options.Insert(0, new AppOption() { Value = string.Empty, Label = "Velg bilmerke" });

            return appOptions;
        }
    }
}
