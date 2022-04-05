﻿using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Options;

namespace App.IntegrationTests.Mocks.Apps.Ttd.DynamicOptionsPdf.Options
{
    public class CommuneAppOptionsProvider : IAppOptionsProvider
    {
        private readonly IAppOptionsFileHandler _appOptionsFileHandler;

        public CommuneAppOptionsProvider(IAppOptionsFileHandler appOptionsFileHandler)
        {
            _appOptionsFileHandler = appOptionsFileHandler;
        }

        public string Id => "kommuner";

        public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            var fylkesNummerProvided = keyValuePairs.TryGetValue("fnr", out string fylkesNummer);

            var appOptions = new AppOptions();
            if (!fylkesNummerProvided || fylkesNummer == "undefined")
            {
                appOptions.Options = new List<AppOption>();
                
                return appOptions;
            }

            appOptions.Options = await _appOptionsFileHandler.ReadOptionsFromFileAsync($"fylke-{fylkesNummer}-kommuner");

            return appOptions;
        }
    }
}
