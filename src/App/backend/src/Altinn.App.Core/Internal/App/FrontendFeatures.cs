using System.Text.Json;
using Microsoft.FeatureManagement;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Default implementation of IFrontendFeatures
/// </summary>
public class FrontendFeatures : IFrontendFeatures
{
    private readonly IFeatureManager _featureManager;

    /// <summary>
    /// Default implementation of IFrontendFeatures
    ///  </summary>
    public FrontendFeatures(IFeatureManager featureManager)
    {
        _featureManager = featureManager;
    }

    /// <inheritdoc />
    public async Task<Dictionary<string, bool>> GetFrontendFeatures()
    {
        var result = new Dictionary<string, bool>();

        await foreach (var name in _featureManager.GetFeatureNamesAsync())
        {
            var camelCaseName = JsonNamingPolicy.CamelCase.ConvertName(name);
            result[camelCaseName] = await _featureManager.IsEnabledAsync(name);
        }

        return result;
    }
}
