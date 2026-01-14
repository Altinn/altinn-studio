using System.Reflection;
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
    ///  </summary>
    public FrontendFeatures(IFeatureManager featureManager)
    {
        _features.Add("footer", true);
        _features.Add("processActions", true);

        var featureFlagFields = typeof(FeatureFlags).GetFields(
            BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy
        );

        foreach (var field in featureFlagFields)
        {
            if (!field.IsLiteral || field.IsInitOnly || field.FieldType != typeof(string))
            {
                continue;
            }

            if (field.GetRawConstantValue() is not string featureName || string.IsNullOrWhiteSpace(featureName))
            {
                continue;
            }

            var lowercaseName = char.ToLowerInvariant(featureName[0]) + featureName[1..];
            _features[lowercaseName] = featureManager.IsEnabledAsync(featureName).GetAwaiter().GetResult();
        }
    }

    /// <inheritdoc />
    public Task<Dictionary<string, bool>> GetFrontendFeatures() => Task.FromResult(_features);
}
