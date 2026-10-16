using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits;

/// <summary>
/// Provides a codelist for counties of Norway.
/// </summary>
internal sealed class CountiesCodelistProvider(IAdministrativeUnitsClient _countiesHttpClient) : IAppOptionsProvider
{
    /// <inheritdoc/>
    public string Id => "fylker-kv";

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
        var counties = await _countiesHttpClient.GetCounties();

        var appOptions = new AppOptions()
        {
            Options = counties.Select(x => new AppOption() { Value = x.Number, Label = x.Name }).ToList(),
        };

        return appOptions;
    }
}
