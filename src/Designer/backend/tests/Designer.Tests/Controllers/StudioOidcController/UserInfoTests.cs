using System.Security.Claims;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.StudioOidcController;

public class UserInfoTests
{
    [Fact]
    public void UserInfo_WhenUnauthenticated_ReturnsNoContent()
    {
        var controller = CreateController(new ClaimsPrincipal(new ClaimsIdentity()));

        ActionResult<UserInfoResponse> result = controller.UserInfo();

        Assert.IsType<NoContentResult>(result.Result);
    }

    [Fact]
    public void UserInfo_WhenAuthenticated_ReturnsUserInformation()
    {
        var identity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.Name, "test-user"),
                new Claim("given_name", "Test"),
                new Claim("family_name", "User"),
            ],
            "TestAuth"
        );
        var controller = CreateController(new ClaimsPrincipal(identity));

        ActionResult<UserInfoResponse> result = controller.UserInfo();

        var response = Assert.IsType<OkObjectResult>(result.Result);
        var userInfo = Assert.IsType<UserInfoResponse>(response.Value);
        Assert.Equal("test-user", userInfo.Username);
        Assert.Equal("Test", userInfo.GivenName);
        Assert.Equal("User", userInfo.FamilyName);
        Assert.Equal("TestAuth", userInfo.AuthMethod);
    }

    [Fact]
    public void UserInfo_WhenAuthenticatedIdentityHasNoUsername_ReturnsServerError()
    {
        var identity = new ClaimsIdentity([], "TestAuth");
        var controller = CreateController(new ClaimsPrincipal(identity));

        ActionResult<UserInfoResponse> result = controller.UserInfo();

        var response = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status500InternalServerError, response.StatusCode);
    }

    private static Altinn.Studio.Designer.Controllers.StudioOidcController CreateController(ClaimsPrincipal principal)
    {
        var controller = new Altinn.Studio.Designer.Controllers.StudioOidcController(
            Mock.Of<IStudioOidcUsernameProvider>(),
            new DeveloperMappingSettings(),
            Mock.Of<IUserProvisioningService>()
        )
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = principal } },
        };

        return controller;
    }
}
