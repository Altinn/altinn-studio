using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Codelists.SSB.Models;

namespace Altinn.Codelists.SSB;

/// <summary>
/// Provides a codelist for marital status codes.
/// </summary>
public class IndustryGroupingCodelistProvider : ClassificationCodelistProvider, IAppOptionsProvider
{
    /// <inheritdoc/>
    public string Id => "næringsgruppering";

    /// Initializes a new instance of the <see cref="MaritalStatusCodelistProvider"/> class.
    public IndustryGroupingCodelistProvider(IClassificationsClient classificationsClient) : base(classificationsClient)
    {
    }

    /// <inheritdoc/>
    public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
    {
        return await GetAppOptionsAsync(Classification.IndustryGrouping, language, keyValuePairs);
    }
}
