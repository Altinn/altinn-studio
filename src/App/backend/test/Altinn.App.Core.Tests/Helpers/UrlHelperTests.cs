using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Tests.Helpers;

public class UrlHelperTests
{
    private readonly UrlHelper _urlHelper;

    public UrlHelperTests()
    {
        var options = Options.Create(new GeneralSettings { HostName = "localhost.altinn.cloud" });
        _urlHelper = new(options);
    }

    [Fact]
    public void GetInstanceUrl_ReturnsFormattedUrl()
    {
        // Arrange
        AppIdentifier app = new("testOrg", "testApp");
        InstanceIdentifier instance = new("50841220/7c811874-deca-428d-b238-019f1a149833");

        // Act
        var result = _urlHelper.GetInstanceUrl(app, instance);

        // Assert
        Assert.Equal(
            "http://localhost.altinn.cloud/testOrg/testApp/#/instance/50841220/7c811874-deca-428d-b238-019f1a149833",
            result
        );
    }
}
