using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.AccessManagement.Helpers;

namespace Altinn.App.Core.Tests.Internal.AccessManagement;

public class UrlHelperTests
{
    [Fact]
    public void CreateInstanceDelegationUrl_GivenAppResourceIdAndInstanceId_ReturnsCorrectUrl()
    {
        // Arrange
        string appResourceId = "appResourceId";
        string instanceId = "instanceId";
        PlatformSettings platformSettings = new()
        {
            ApiAccessManagementEndpoint = "https://apiaccessmanagementendpoint.com",
        };

        UrlHelper urlHelper = new(platformSettings);

        // Act
        string result = urlHelper.CreateInstanceDelegationUrl(appResourceId, instanceId);

        // Assert
        Assert.Equal(
            "https://apiaccessmanagementendpoint.com/app/delegations/resource/appResourceId/instance/instanceId",
            result
        );
    }

    [Fact]
    public void CreateInstanceRevokeUrl_GivenAppResourceIdAndInstanceId_ReturnsCorrectUrl()
    {
        // Arrange
        string appResourceId = "appResourceId";
        string instanceId = "instanceId";
        PlatformSettings platformSettings = new()
        {
            ApiAccessManagementEndpoint = "https://apiaccessmanagementendpoint.com",
        };

        UrlHelper urlHelper = new(platformSettings);

        // Act
        string result = urlHelper.CreateInstanceRevokeUrl(appResourceId, instanceId);

        // Assert
        Assert.Equal(
            "https://apiaccessmanagementendpoint.com/app/delegationrevoke/resource/appResourceId/instance/instanceId",
            result
        );
    }
}
