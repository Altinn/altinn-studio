#nullable disable
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
        var expected = new Dictionary<string, bool>()
        {
            { "jsonObjectInDataResponse", true },
            { "betaPDFenabled", true },
        };

        var featureManagerMock = new Mock<IFeatureManager>();
        featureManagerMock
            .Setup(m => m.GetFeatureNamesAsync())
            .Returns(new[] { "jsonObjectInDataResponse", "betaPDFenabled" }.ToAsyncEnumerable());
        featureManagerMock.Setup(m => m.IsEnabledAsync(It.IsAny<string>())).ReturnsAsync(true);

        IFrontendFeatures frontendFeatures = new FrontendFeatures(featureManagerMock.Object);

        var actual = await frontendFeatures.GetFrontendFeatures();

        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetFeatures_returns_correct_enabled_status_for_each_feature()
    {
        var expected = new Dictionary<string, bool>() { { "featureA", true }, { "featureB", false } };

        var featureManagerMock = new Mock<IFeatureManager>();
        featureManagerMock
            .Setup(m => m.GetFeatureNamesAsync())
            .Returns(new[] { "featureA", "featureB" }.ToAsyncEnumerable());
        featureManagerMock.Setup(f => f.IsEnabledAsync("featureA")).ReturnsAsync(true);
        featureManagerMock.Setup(f => f.IsEnabledAsync("featureB")).ReturnsAsync(false);

        IFrontendFeatures frontendFeatures = new FrontendFeatures(featureManagerMock.Object);

        var actual = await frontendFeatures.GetFrontendFeatures();

        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetFeatures_does_not_return_undefined_features()
    {
        var featureManagerMock = new Mock<IFeatureManager>();
        featureManagerMock.Setup(m => m.GetFeatureNamesAsync()).Returns(AsyncEnumerable.Empty<string>());

        IFrontendFeatures frontendFeatures = new FrontendFeatures(featureManagerMock.Object);

        var actual = await frontendFeatures.GetFrontendFeatures();

        actual.Should().BeEmpty();
    }
}
