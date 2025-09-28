using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Codelists.Kartverket.AdministrativeUnits.Models;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits;

/// <summary>
/// Provides a codelist for municipalities of Norway.
/// </summary>
internal sealed class MunicipalitiesCodelistProvider(IAdministrativeUnitsClient _administrativeUnitsHttpClient)
    : IAppOptionsProvider
{
    /// <inheritdoc/>
    public string Id => "kommuner-kv";

    /// <inheritdoc/>
    public async Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
    {
        bool hasCountyParam = keyValuePairs.TryGetValue("fnr", out string? countyNumber);

        List<Municipality> municipalities =
            hasCountyParam && countyNumber != null
                ? await _administrativeUnitsHttpClient.GetMunicipalities(countyNumber)
                : await _administrativeUnitsHttpClient.GetMunicipalities();

        var appOptions = new AppOptions()
        {
            Options = municipalities.Select(x => new AppOption() { Value = x.Number, Label = x.Name }).ToList(),
            Parameters =
                hasCountyParam && countyNumber != null
                    ? new Dictionary<string, string?>() { { "fnr", countyNumber } }
                    : new Dictionary<string, string?>(),
        };

        return appOptions;
    }
}
