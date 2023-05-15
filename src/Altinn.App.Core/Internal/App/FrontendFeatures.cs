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
        public FrontendFeatures()
        {
            features.Add("footer", true);
            features.Add("processActions", true);
        }

        /// <inheritdoc />
        public Task<Dictionary<string, bool>> GetFrontendFeatures()
        {
            return Task.FromResult(features);
        }
    }
}
