using Altinn.App.Core.Configuration;

namespace Altinn.App.Core.Tests.Configuration;

public class PlatformFrontendSettingsTests
{
    [Theory]
    [InlineData("tt02.altinn.no", "https://af.tt02.altinn.no/", "https://am.ui.tt02.altinn.no/")]
    [InlineData("altinn.no", "https://af.altinn.no/", "https://am.ui.altinn.no/")]
    [InlineData("yt01.altinn.cloud", "https://af.yt01.altinn.cloud/", "https://am.ui.yt01.altinn.cloud/")]
    public void Resolve_ReplacesHostNamePlaceholder(
        string hostName,
        string expectedArbeidsflate,
        string expectedAccessManagement
    )
    {
        // Arrange
        var settings = new PlatformFrontendSettings();

        // Act
        var resolved = settings.Resolve(hostName);

        // Assert
        Assert.Equal(expectedArbeidsflate, resolved.ArbeidsflateBaseUrl);
        Assert.Equal(expectedAccessManagement, resolved.AccessManagementBaseUrl);
    }

    [Fact]
    public void Resolve_DoesNotMutateOriginalAndCopiesOtherSettings()
    {
        // Arrange
        var settings = new PlatformFrontendSettings();

        // Act
        var resolved = settings.Resolve("tt02.altinn.no");

        // Assert - placeholder still present on the original instance
        Assert.Equal("https://af.{hostName}/", settings.ArbeidsflateBaseUrl);
        Assert.Equal("https://am.ui.{hostName}/", settings.AccessManagementBaseUrl);
        // Assert - non-templated settings are carried over unchanged
        Assert.Equal(settings.PostalCodesUrl, resolved.PostalCodesUrl);
        Assert.Equal(settings.AltinnLogoUrl, resolved.AltinnLogoUrl);
        Assert.Equal(settings.HelpCircleIllustrationUrl, resolved.HelpCircleIllustrationUrl);
    }
}
