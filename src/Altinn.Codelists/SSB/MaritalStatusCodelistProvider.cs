using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Codelists.SSB.Models;

namespace Altinn.Codelists.SSB;

/// <summary>
/// Provides a codelist for marital status codes.
/// </summary>
public class MaritalStatusCodelistProvider : ClassificationCodelistProvider, IAppOptionsProvider
{
    /// <inheritdoc/>
    public string Id => "sivilstand";

    /// <summary>
    /// Initializes a new instance of the <see cref="MaritalStatusCodelistProvider"/> class.
    /// </summary>
    public MaritalStatusCodelistProvider(IClassificationsClient classificationsClient) : base(classificationsClient)
    {
    }

    /// <inheritdoc/>
    public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
    {
        return await GetAppOptionsAsync(Classification.MaritalStatus, language, keyValuePairs);
    }
}
