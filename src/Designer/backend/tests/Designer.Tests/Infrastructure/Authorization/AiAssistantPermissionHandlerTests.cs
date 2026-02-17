using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Infrastructure.Authorization;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Microsoft.AspNetCore.Authorization;
using Moq;
using Xunit;

namespace Designer.Tests.Infrastructure.Authorization;

public class AiAssistantPermissionHandlerTests
{
    private const string AllowedOrg = "ttd";

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenUserNotAuthenticated()
    {
        var giteaMock = new Mock<IGiteaClient>();
        var userOrganizationService = new UserOrganizationService(giteaMock.Object);
        var handler = new AiAssistantPermissionHandler(userOrganizationService);
        var requirement = new AiAssistantPermissionRequirement();

        var user = new ClaimsPrincipal();
        var context = new AuthorizationHandlerContext(
            [requirement],
            user,
            resource: null
        );

        await handler.HandleAsync(context);
        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldSucceed_WhenUserIsMemberOfAllowedOrganization()
    {
        var giteaMock = new Mock<IGiteaClient>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync([new Organization { Username = AllowedOrg }]);

        var userOrganizationService = new UserOrganizationService(giteaMock.Object);
        var handler = new AiAssistantPermissionHandler(userOrganizationService);
        var requirement = new AiAssistantPermissionRequirement();

        var user = new ClaimsPrincipal(new ClaimsIdentity([], "TestUserLogin"));
        var context = new AuthorizationHandlerContext(
            [requirement],
            user,
            resource: null
        );

        await handler.HandleAsync(context);

        Assert.True(context.HasSucceeded);
        Assert.False(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenUserIsNotMemberOfAllowedOrganization()
    {
        var giteaMock = new Mock<IGiteaClient>();
        giteaMock.Setup(g => g.GetUserOrganizations())
            .ReturnsAsync([new Organization { Username = "other-org" }]);

        var userOrganizationService = new UserOrganizationService(giteaMock.Object);
        var handler = new AiAssistantPermissionHandler(userOrganizationService);
        var requirement = new AiAssistantPermissionRequirement();

        var user = new ClaimsPrincipal(new ClaimsIdentity([], "TestUserLogin"));
        var context = new AuthorizationHandlerContext(
            [requirement],
            user,
            resource: null
        );

        await handler.HandleAsync(context);
        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }
}
