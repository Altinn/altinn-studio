#nullable disable
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using FluentAssertions;
using Microsoft.FeatureManagement;
using Moq;

namespace Altinn.App.Core.Tests.Internal.App;

public class FrontendFeaturesTest
{
    [Fact]
    public async Task GetFeatures_returns_list_of_enabled_features()
    {
        Dictionary<string, bool> expected = new Dictionary<string, bool>()
        {
            { "jsonObjectInDataResponse", false },
            { "betaPDFenabled", false },
            { "addInstanceIdentifierToLayoutRequests", false },
            { "simpleTableEnabled", false },
        };

        var featureManagerMock = new Mock<IFeatureManager>();
        IFrontendFeatures frontendFeatures = new FrontendFeatures(featureManagerMock.Object);

        var actual = await frontendFeatures.GetFrontendFeatures();

        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetFeatures_returns_list_of_enabled_features_when_feature_flag_is_enabled()
    {
        Dictionary<string, bool> expected = new Dictionary<string, bool>()
        {
            { "jsonObjectInDataResponse", true },
            { "betaPDFenabled", false },
            { "addInstanceIdentifierToLayoutRequests", false },
            { "simpleTableEnabled", false },
        };
        var featureManagerMock = new Mock<IFeatureManager>();
        featureManagerMock.Setup(f => f.IsEnabledAsync(FeatureFlags.JsonObjectInDataResponse)).ReturnsAsync(true);
        IFrontendFeatures frontendFeatures = new FrontendFeatures(featureManagerMock.Object);
        var actual = await frontendFeatures.GetFrontendFeatures();
        actual.Should().BeEquivalentTo(expected);
    }
}
