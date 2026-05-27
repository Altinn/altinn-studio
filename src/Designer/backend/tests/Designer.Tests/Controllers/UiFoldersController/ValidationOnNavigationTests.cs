using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Altinn.Studio.Designer.Tests.Controllers;

public class ValidationOnNavigationTests
{
    private readonly Mock<IUiFoldersService> _uiFoldersServiceMock;
    private readonly UiFoldersController _controller;
    private static readonly string[] s_expected = ["Expression", "Schema"];

    public ValidationOnNavigationTests()
    {
        _uiFoldersServiceMock = new Mock<IUiFoldersService>();

        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, "test-user")], "TestAuth")),
        };

        _controller = new UiFoldersController(_uiFoldersServiceMock.Object)
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext },
        };
    }

    [Fact]
    public async Task GetGlobalValidationOnNavigation_ReturnsOkWithConfig()
    {
        // Arrange
        var expectedConfig = new ValidationOnNavigation { Page = "current", Show = ["Expression", "Schema"] };
        _uiFoldersServiceMock
            .Setup(s =>
                s.GetGlobalValidationOnNavigation(It.IsAny<AltinnRepoEditingContext>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(expectedConfig);

        // Act
        IActionResult result = await _controller.GetGlobalValidationOnNavigation("ttd", "app", CancellationToken.None);

        // Assert
        OkObjectResult okResult = Assert.IsType<OkObjectResult>(result);

        ValidationOnNavigation config = Assert.IsType<ValidationOnNavigation>(okResult.Value);

        Assert.Equal("current", config.Page);
        Assert.Equal(s_expected, config.Show);
    }

    [Fact]
    public async Task SaveGlobalValidationOnNavigation_ReturnsOk()
    {
        // Arrange
        var config = new ValidationOnNavigation { Page = "current", Show = ["Expression"] };
        _uiFoldersServiceMock
            .Setup(s =>
                s.SaveGlobalValidationOnNavigation(
                    It.IsAny<AltinnRepoEditingContext>(),
                    config,
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask)
            .Verifiable();

        // Act
        IActionResult result = await _controller.SaveGlobalValidationOnNavigation(
            "ttd",
            "app",
            config,
            CancellationToken.None
        );

        // Assert
        Assert.IsType<OkResult>(result);
        _uiFoldersServiceMock.Verify();
    }

    [Fact]
    public async Task DeleteGlobalValidationOnNavigation_ReturnsOk()
    {
        // Arrange
        _uiFoldersServiceMock
            .Setup(s =>
                s.SaveGlobalValidationOnNavigation(
                    It.IsAny<AltinnRepoEditingContext>(),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask)
            .Verifiable();

        // Act
        IActionResult result = await _controller.DeleteGlobalValidationOnNavigation(
            "ttd",
            "app",
            CancellationToken.None
        );

        // Assert
        Assert.IsType<OkResult>(result);
        _uiFoldersServiceMock.Verify();
    }
}
