using System.Net;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Features.ExternalApi;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Features.ExternalApi;

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
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        okResult?.StatusCode.Should().Be((int)HttpStatusCode.OK);
        okResult?.Value.Should().Be(externalApiData);
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
        result.Should().BeOfType<NotFoundObjectResult>();
        var objectResult = result as NotFoundObjectResult;
        objectResult?.StatusCode.Should().Be((int)HttpStatusCode.NotFound);
        objectResult?.Value.Should().Be("External api not found.");
    }

    [Fact]
    public async Task Get_ShouldThrowException_WhenExternalApiServiceThrowsException()
    {
        //Arrange
        string externalApiId = "apiId";
        Dictionary<string, string> queryParams = [];

        _externalApiServiceMock
            .Setup(s => s.GetExternalApiData(externalApiId, It.IsAny<InstanceIdentifier>(), queryParams))
            .Throws<Exception>();

        var controller = new ExternalApiController(_loggerMock.Object, _externalApiServiceMock.Object);

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(
            async () => await controller.Get(1, Guid.NewGuid(), externalApiId, queryParams)
        );
    }

    [Fact]
    public async Task Get_ShouldReturnStatusCode_WhenExternalApiServiceThrowsHttpRequestException()
    {
        // Arrange
        string externalApiId = "apiId";
        Dictionary<string, string> queryParams = [];

        _externalApiServiceMock
            .Setup(s => s.GetExternalApiData(externalApiId, It.IsAny<InstanceIdentifier>(), queryParams))
            .ThrowsAsync(
                new HttpRequestException("Error message", new HttpRequestException(), HttpStatusCode.BadRequest)
            );

        var controller = new ExternalApiController(_loggerMock.Object, _externalApiServiceMock.Object);

        // Act
        var result = await controller.Get(1, Guid.NewGuid(), externalApiId, queryParams);

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var objectResult = result as ObjectResult;
        objectResult?.StatusCode.Should().Be((int)HttpStatusCode.BadRequest);
        objectResult?.Value.Should().Be("Error message");
    }
}
