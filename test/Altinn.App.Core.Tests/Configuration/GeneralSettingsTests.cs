using Altinn.App.Core.Configuration;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Tests.Configuration;

public class GeneralSettingsTests
{
    private readonly GeneralSettings _settings;

    public GeneralSettingsTests()
    {
        var options = Options.Create(new GeneralSettings { HostName = "localhost.altinn.cloud" });
        _settings = options.Value;
    }

    [Fact]
    public void FormattedExternalAppBaseUrl_GivenAppIdentifier_ReturnsFormattedUrl()
    {
        // Arrange
        AppIdentifier app = new("testOrg", "testApp");

        // Act
        var result = _settings.FormattedExternalAppBaseUrl(app);

        // Assert
        Assert.Equal($"http://localhost.altinn.cloud/testOrg/testApp/", result);
    }

    [Fact]
    public void FormattedExternalAppBaseUrlWithTrailingPound_GivenAppIdentifier_ReturnsFormattedUrlWithTrailingPound()
    {
        // Arrange
        AppIdentifier app = new("testOrg", "testApp");

        // Act
        var result = _settings.FormattedExternalAppBaseUrlWithTrailingPound(app);

        // Assert
        Assert.Equal($"http://localhost.altinn.cloud/testOrg/testApp/#", result);
    }
}
