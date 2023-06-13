using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using FluentAssertions;
using Microsoft.FeatureManagement;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.App
{
    public class FrontendFeaturesTest
    {
        [Fact]
        public async Task GetFeatures_returns_list_of_enabled_features()
        {
            var featureManagerMock = new Mock<IFeatureManager>();
            IFrontendFeatures frontendFeatures = new FrontendFeatures(featureManagerMock.Object);

            var actual = await frontendFeatures.GetFrontendFeatures();

            actual.Should().Contain(new KeyValuePair<string, bool>("footer", true));
        }

        [Fact]
        public async Task GetFeatures_returns_list_of_enabled_features_when_feature_flag_is_enabled()
        {
            var featureManagerMock = new Mock<IFeatureManager>();
            featureManagerMock.Setup(f => f.IsEnabledAsync(FeatureFlags.JsonObjectInDataResponse, default)).ReturnsAsync(true);
            IFrontendFeatures frontendFeatures = new FrontendFeatures(featureManagerMock.Object);
            var actual = await frontendFeatures.GetFrontendFeatures();
            actual.Should().Contain(new KeyValuePair<string, bool>("jsonObjectInDataResponse", true));
        }
    }
}
