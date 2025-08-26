using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.Authorization;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Moq;
using Xunit;

namespace Designer.Tests.Infrastructure.Authorization;

public class BelongsToOrganizationHandlerTests
{
    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenUserNotAuthenticated()
    {
        var userOrganizationServiceMock = new Mock<IUserOrganizationService>();
        var handler = new BelongsToOrganizationHandler(userOrganizationServiceMock.Object);
        var requirement = new BelongsToOrganizationRequirement();

        var user = new ClaimsPrincipal();
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

        await handler.HandleAsync(context);
        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldSucceed_WhenUserIsMemberOfOrganization()
    {
        var userOrganizationServiceMock = new Mock<IUserOrganizationService>();
        userOrganizationServiceMock.Setup(s => s.UserIsMemberOfAnyOrganization())
            .ReturnsAsync(true);

        var handler = new BelongsToOrganizationHandler(userOrganizationServiceMock.Object);
        var requirement = new BelongsToOrganizationRequirement();

        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestUserLogin"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

        await handler.HandleAsync(context);

        Assert.True(context.HasSucceeded);
        Assert.False(context.HasFailed);
    }

    [Fact]
    public async Task HandleRequirementAsync_ShouldFail_WhenUserIsNotMemberOfOrganization()
    {
        var userOrganizationServiceMock = new Mock<IUserOrganizationService>();
        userOrganizationServiceMock.Setup(s => s.UserIsMemberOfAnyOrganization())
            .ReturnsAsync(false);

        var handler = new BelongsToOrganizationHandler(userOrganizationServiceMock.Object);
        var requirement = new BelongsToOrganizationRequirement();

        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] { }, "TestUserLogin"));
        var context = new AuthorizationHandlerContext(
            new[] { requirement },
            user,
            resource: null
        );

        await handler.HandleAsync(context);
        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
    }
}
