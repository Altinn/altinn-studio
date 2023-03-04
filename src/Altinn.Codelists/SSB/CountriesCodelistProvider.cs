using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Codelists.SSB.Models;

namespace Altinn.Codelists.SSB;

/// <summary>
/// Provides a codelist for country codes.
/// </summary>
public class CountriesCodelistProvider : ClassificationCodelistProvider, IAppOptionsProvider
{
    /// <inheritdoc/>
    public string Id => "land";

    /// <summary>
    /// Initializes a new instance of the <see cref="CountriesCodelistProvider"/> class.
    /// </summary>
    public CountriesCodelistProvider(IClassificationsClient classificationsClient) : base(classificationsClient)
    {
    }

    /// <inheritdoc/>
    public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
    {
        return await GetAppOptionsAsync(Classification.Countries, language, keyValuePairs);
    }
}
