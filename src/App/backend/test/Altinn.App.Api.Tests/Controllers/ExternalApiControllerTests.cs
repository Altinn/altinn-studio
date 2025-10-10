using System.Net;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Features.ExternalApi;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Api.Tests.Controllers;

public class ExternalApiControllerTests
{
    private readonly Mock<ILogger<ExternalApiController>> _loggerMock;
    private readonly Mock<IExternalApiService> _externalApiServiceMock;

    public ExternalApiControllerTests()
    {
        _loggerMock = new Mock<ILogger<ExternalApiController>>();
        _externalApiServiceMock = new Mock<IExternalApiService>();
    }

    [Fact]
    public async Task Get_ShouldReturnOkResult_WhenExternalApiDataIsFound()
    {
        // Arrange
        string externalApiId = "apiId";
        Dictionary<string, string> queryParams = [];
        var externalApiData = new object();

        _externalApiServiceMock
            .Setup(s => s.GetExternalApiData(externalApiId, It.IsAny<InstanceIdentifier>(), queryParams))
            .ReturnsAsync(new ExternalApiDataResult(externalApiData, true));

        var controller = new ExternalApiController(_loggerMock.Object, _externalApiServiceMock.Object);

        // Act
        var result = await controller.Get(1, Guid.NewGuid(), externalApiId, queryParams);

        // Assert
        var okResult = result as OkObjectResult;
        Assert.NotNull(okResult);
        okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
        okResult.Value.Should().Be(externalApiData);
    }

    [Fact]
    public async Task Get_ShouldReturnNotFoundResult_WhenExternalApiDataIsNotFound()
    {
        // Arrange
        string externalApiId = "unknown";
        Dictionary<string, string> queryParams = [];

        _externalApiServiceMock
            .Setup(s => s.GetExternalApiData(externalApiId, It.IsAny<InstanceIdentifier>(), queryParams))
            .ReturnsAsync(new ExternalApiDataResult(null, false));

        var controller = new ExternalApiController(_loggerMock.Object, _externalApiServiceMock.Object);

        // Act
        var result = await controller.Get(1, Guid.NewGuid(), externalApiId, queryParams);

        // Assert
        var objectResult = result as BadRequestObjectResult;
        Assert.NotNull(objectResult);
        objectResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        objectResult.Value.Should().Be($"External api with id '{externalApiId}' not found.");
    }

    [Fact]
    public async Task Get_ShouldReturnHttpStatus500_WhenExternalApiServiceThrowsUnhandledException()
    {
        //Arrange
        string externalApiId = "apiId";
        Dictionary<string, string> queryParams = [];

        _externalApiServiceMock
            .Setup(s => s.GetExternalApiData(externalApiId, It.IsAny<InstanceIdentifier>(), queryParams))
            .ThrowsAsync(new Exception("Error message"));

        var controller = new ExternalApiController(_loggerMock.Object, _externalApiServiceMock.Object);

        // Act
        var result = await controller.Get(1, Guid.NewGuid(), externalApiId, queryParams);

        // Assert
        var objectResult = result as ObjectResult;
        Assert.NotNull(objectResult);
        objectResult.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);
        objectResult.Value.Should().Match(x => ((string)x).EndsWith("Error message"));
    }

    [Theory]
    [InlineData("Error message")]
    [InlineData("")]
    public async Task Get_ShouldReturnStatusCode_AndFallbackToDefaultMessage_WhenExternalApiServiceThrowsHttpRequestException(
        string errorMessage
    )
    {
        // Arrange
        string externalApiId = "apiId";
        Dictionary<string, string> queryParams = [];

        _externalApiServiceMock
            .Setup(s => s.GetExternalApiData(externalApiId, It.IsAny<InstanceIdentifier>(), queryParams))
            .ThrowsAsync(new HttpRequestException(errorMessage, new HttpRequestException(), HttpStatusCode.BadRequest));

        var controller = new ExternalApiController(_loggerMock.Object, _externalApiServiceMock.Object);

        // Act
        var result = await controller.Get(1, Guid.NewGuid(), externalApiId, queryParams);

        // Assert
        var objectResult = result as ObjectResult;
        Assert.NotNull(objectResult);
        objectResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);

        objectResult
            .Value.Should()
            .Be(
                string.IsNullOrWhiteSpace(errorMessage)
                    ? "An error occurred when calling external api"
                    : "Error message"
            );
    }
}
