using Altinn.App.Core.Models;
using Altinn.App.Core.Features;
using Altinn.Codelists.Kartverket.AdministrativeUnits.Models;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits;

/// <summary>
/// Provides a codelist for communes of Norway.
/// </summary>
public class CommunesCodelistProvider : IAppOptionsProvider
{
    private readonly IAdministrativeUnitsClient _administrativeUnitsHttpClient;

    /// <inheritdoc/>
    public string Id => "kommuner";

    /// <summary>
    /// Initializes a new instance of the <see cref="CommunesCodelistProvider"/> class.
    /// </summary>
    public CommunesCodelistProvider(IAdministrativeUnitsClient administrativeUnitsHttpClient)
    {
        _administrativeUnitsHttpClient = administrativeUnitsHttpClient;
    }

    /// <inheritdoc/>
    public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
    {
        bool hasCountyParam = keyValuePairs.TryGetValue("fnr", out string? countyNumber);

        List<Commune> communes;
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
