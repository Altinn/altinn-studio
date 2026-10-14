using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Codelists.Posten.Clients;

namespace Altinn.Codelists.Posten;

/// <summary>
/// Post codes and corresponding names for Norway.
/// </summary>
internal sealed class PostalCodesCodelistsProvider : IAppOptionsProvider
{
    private readonly IPostalCodesClient _postalCodesClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="PostalCodesCodelistsProvider"/> class.
    /// </summary>
    public PostalCodesCodelistsProvider(IPostalCodesClient postalCodesClient)
    {
        _postalCodesClient = postalCodesClient;
    }

    /// <inheritdoc/>
    public string Id => "poststed";

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
        List<PostalCodeRecord> postalCodes = await _postalCodesClient.GetPostalCodes();

        var appOptions = new AppOptions
        {
            Options = postalCodes.Select(x => new AppOption() { Value = x.PostCode, Label = x.PostalName }).ToList(),
        };

        return appOptions;
    }
}
