using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Codelists.SSB.Models;

namespace Altinn.Codelists.SSB;

/// <summary>
/// Provides a codelist for counties codes.
/// </summary>
public class CountiesCodelistProvider : ClassificationCodelistProvider, IAppOptionsProvider
{
    /// <inheritdoc/>
    public string Id => "fylker";

    /// <summary>
    /// Initializes a new instance of the <see cref="CountiesCodelistProvider"/> class.
    /// </summary>
    public CountiesCodelistProvider(IClassificationsClient classificationsClient) : base(classificationsClient)
    {
    }

    /// <inheritdoc/>
    public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
    {
        return await GetAppOptionsAsync(Classification.Counties, language, keyValuePairs);
    }
}
