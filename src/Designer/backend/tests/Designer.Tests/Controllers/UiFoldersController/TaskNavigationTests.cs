using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Altinn.Studio.Designer.Tests.Controllers;

public class TaskNavigationTests
{
    private readonly Mock<IUiFoldersService> _uiFoldersServiceMock;
    private readonly UiFoldersController _controller;

    public TaskNavigationTests()
    {
        _uiFoldersServiceMock = new Mock<IUiFoldersService>();
        _controller = new UiFoldersController(_uiFoldersServiceMock.Object);
    }

    [Fact]
    public async Task GetGlobalTaskNavigation_ReturnsOkWithGroups()
    {
        // Arrange
        var expectedGroups = new List<TaskNavigationGroupDto>
        {
            new()
            {
                TaskId = "Task_1",
                TaskType = "typeA",
                Name = "First",
            },
            new()
            {
                TaskId = "Task_2",
                TaskType = "typeB",
                Name = "Second",
            },
        };

        _uiFoldersServiceMock
            .Setup(s =>
                s.GetGlobalTaskNavigationDto(It.IsAny<AltinnRepoEditingContext>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(expectedGroups);

        // Act
        IActionResult result = await _controller.GetGlobalTaskNavigation("ttd", "app", CancellationToken.None);

        // Assert
        OkObjectResult okResult = Assert.IsType<OkObjectResult>(result);
        List<TaskNavigationGroupDto> groups = Assert.IsType<List<TaskNavigationGroupDto>>(okResult.Value);

        Assert.Equal(2, groups.Count);

        Assert.Equal("Task_1", groups[0].TaskId);
        Assert.Equal("typeA", groups[0].TaskType);
        Assert.Equal("First", groups[0].Name);

        Assert.Equal("Task_2", groups[1].TaskId);
        Assert.Equal("typeB", groups[1].TaskType);
        Assert.Equal("Second", groups[1].Name);
    }

    [Fact]
    public async Task UpdateGlobalTaskNavigation_ReturnsNoContent()
    {
        // Arrange
        var inputGroups = new List<TaskNavigationGroupDto>
        {
            new()
            {
                TaskId = "Task_1",
                TaskType = "typeA",
                Name = "First",
            },
        };
        _uiFoldersServiceMock
            .Setup(s =>
                s.UpdateGlobalTaskNavigation(
                    It.IsAny<AltinnRepoEditingContext>(),
                    inputGroups,
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask)
            .Verifiable();

        // Act
        IActionResult result = await _controller.UpdateGlobalTaskNavigation(
            "ttd",
            "app",
            inputGroups,
            CancellationToken.None
        );

        // Assert
        Assert.IsType<NoContentResult>(result);
        _uiFoldersServiceMock.Verify();
    }

    [Fact]
    public async Task UpdateGlobalTaskNavigation_WhenException_ReturnsBadRequest()
    {
        // Arrange
        var inputGroups = new List<TaskNavigationGroupDto>();
        _uiFoldersServiceMock
            .Setup(s =>
                s.UpdateGlobalTaskNavigation(
                    It.IsAny<AltinnRepoEditingContext>(),
                    inputGroups,
                    It.IsAny<CancellationToken>()
                )
            )
            .Throws(new System.ArgumentException("Invalid input"));

        // Act
        IActionResult result = await _controller.UpdateGlobalTaskNavigation(
            "ttd",
            "app",
            inputGroups,
            CancellationToken.None
        );

        // Assert
        BadRequestObjectResult badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Invalid input", badRequest.Value);
    }
}
