using Altinn.App.Core.Models;
using Altinn.App.Core.Features;
using Altinn.Codelists.Kartverket.AdministrativeUnits.Models;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits;

/// <summary>
/// Provides a codelist for municipalities of Norway.
/// </summary>
public class MunicipalitiesCodelistProvider : IAppOptionsProvider
{
    private readonly IAdministrativeUnitsClient _administrativeUnitsHttpClient;

    /// <inheritdoc/>
    public string Id => "kommuner-kv";

    /// <summary>
    /// Initializes a new instance of the <see cref="MunicipalitiesCodelistProvider"/> class.
    /// </summary>
    public MunicipalitiesCodelistProvider(IAdministrativeUnitsClient administrativeUnitsHttpClient)
    {
        _administrativeUnitsHttpClient = administrativeUnitsHttpClient;
    }

    /// <inheritdoc/>
    public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
    {
        bool hasCountyParam = keyValuePairs.TryGetValue("fnr", out string? countyNumber);

        List<Municipality> municipalities = hasCountyParam && countyNumber != null
            ? await _administrativeUnitsHttpClient.GetMunicipalities(countyNumber)
            : await _administrativeUnitsHttpClient.GetMunicipalities();

        var appOptions = new AppOptions()
        {
            Options = municipalities.Select(x => new AppOption() { Value = x.Number, Label = x.Name }).ToList(),
            Parameters = hasCountyParam && countyNumber != null ? new Dictionary<string, string>() { { "fnr", countyNumber } } : new Dictionary<string, string>()
        };

        return appOptions;
    }
}
