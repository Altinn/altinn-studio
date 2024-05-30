using Altinn.App.Core.Features;
using Microsoft.FeatureManagement;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Default implementation of IFrontendFeatures
/// </summary>
public class FrontendFeatures : IFrontendFeatures
{
    private readonly Dictionary<string, bool> _features = new();

    /// <summary>
    /// Default implementation of IFrontendFeatures
    /// </summary>
    public FrontendFeatures(IFeatureManager featureManager)
    {
        _features.Add("footer", true);
        _features.Add("processActions", true);

        if (featureManager.IsEnabledAsync(FeatureFlags.JsonObjectInDataResponse).Result)
        {
            _features.Add("jsonObjectInDataResponse", true);
        }
        else
        {
            _features.Add("jsonObjectInDataResponse", false);
        }
    }

    /// <inheritdoc />
    public Task<Dictionary<string, bool>> GetFrontendFeatures()
    {
        return Task.FromResult(_features);
    }
}
