using Altinn.App.Core.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Moq;

namespace Altinn.App.Core.Tests.Helpers;

public class SelfLinkHelperTests
{
    [Theory]
    [InlineData("ttd.apps.altinn.no", "copy-me", "1337")]
    [InlineData("skd.apps.altinn.no", "copy-this", "7474")]
    public void BuildFrontendSelfLink(string host, string appId, string partyId)
    {
        // Arrange
        Guid instanceGuid = Guid.NewGuid();
        Instance instance = new() { Id = $"{partyId}/{instanceGuid}", AppId = appId };

        Mock<HttpRequest> requestMock = new();
        requestMock.Setup(r => r.Host).Returns(new HostString(host));

        // Act
        string url = SelfLinkHelper.BuildFrontendSelfLink(instance, requestMock.Object);

        // Assert
        Assert.Contains(host, url);
        Assert.Contains("/#/instance/", url);
        Assert.Contains(partyId, url);
        Assert.Contains(instanceGuid.ToString(), url);
        Assert.Contains(appId, url);
    }
}
