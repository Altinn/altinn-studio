using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PsA3Forms.Clients;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core
{
    public class CountryAppOptionsProvider : IAppOptionsProvider

    {
        public string Id { get; set; } = "countries";
        public readonly ICountryClient _countryClient;
        ILogger<IAppOptionsProvider> _logger;

        public CountryAppOptionsProvider(ICountryClient countryClient)
        {
            _countryClient = countryClient;
        }

        public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            try
            {
                AppOptions countries = await _countryClient.GetCountries(language);
                return countries;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex.ToString());
                return new AppOptions { Options = new List<AppOption>() };
            }
        }
    }
}
