using Altinn.App.Core.Features;
using Microsoft.FeatureManagement;

namespace Altinn.App.Core.Internal.App
{
    /// <summary>
    /// Default implementation of IFrontendFeatures
    /// </summary>
    public class FrontendFeatures : IFrontendFeatures
    {
        private readonly Dictionary<string, bool> features = new();

        /// <summary>
        /// Default implementation of IFrontendFeatures
        /// </summary>
        public FrontendFeatures(IFeatureManager featureManager)
        {
            features.Add("footer", true);
            features.Add("processActions", true);

            if (featureManager.IsEnabledAsync(FeatureFlags.JsonObjectInDataResponse).Result)
            {
                features.Add("jsonObjectInDataResponse", true);
            }
            else
            {
                features.Add("jsonObjectInDataResponse", false);
            }
        }

        /// <inheritdoc />
        public Task<Dictionary<string, bool>> GetFrontendFeatures()
        {
            return Task.FromResult(features);
        }
    }
}
