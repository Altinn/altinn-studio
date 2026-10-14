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

    /// <summary>
    /// Calls <see cref="GetAppOptions(string?, Dictionary{string, string})"/>. A release pack builds against an
    /// Altinn.App.Core version from before <c>IAppOptionsProvider.GetAppOptionsAsync</c> was renamed, where this
    /// implements the interface. Remove it when the pin in Directory.Packages.props has the rename.
    /// </summary>
    public Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs) =>
        GetAppOptions(language, keyValuePairs);

    /// <inheritdoc/>
    public async Task<AppOptions> GetAppOptions(string? language, Dictionary<string, string> keyValuePairs)
    {
        bool hasCountyParam = keyValuePairs.TryGetValue("fnr", out string? countyNumber);
        List<Municipality> municipalities =
            hasCountyParam && countyNumber != null
                ? await _administrativeUnitsHttpClient.GetMunicipalities(countyNumber)
                : await _administrativeUnitsHttpClient.GetMunicipalities();

        var appOptions = new AppOptions()
        {
            // The Norwegian name is not part of the response for the /fylker endpoint, so we only use it when we call the /kommuner endpoint.
            Options = municipalities
                .Select(x => new AppOption()
                {
                    Value = x.Number,
                    Label = hasCountyParam && countyNumber != null ? x.Name : x.NameInNorwegian,
                })
                .ToList(),
            Parameters =
                hasCountyParam && countyNumber != null
                    ? new Dictionary<string, string?>() { { "fnr", countyNumber } }
                    : new Dictionary<string, string?>(),
        };

        return appOptions;
    }
}
