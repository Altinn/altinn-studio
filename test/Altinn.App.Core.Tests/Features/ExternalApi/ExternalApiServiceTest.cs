using Altinn.App.Core.Features.ExternalApi;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Features.ExternalApi;

public class ExternalApiServiceTests
{
    private readonly Mock<ILogger<ExternalApiService>> _loggerMock;
    private readonly Mock<IExternalApiFactory> _externalApiFactoryMock;
    private readonly Mock<IExternalApiClient> _externalApiClientMock;
    private readonly Mock<InstanceIdentifier> _instanceIdentifierMock;

    public ExternalApiServiceTests()
    {
        _loggerMock = new Mock<ILogger<ExternalApiService>>();
        _externalApiFactoryMock = new Mock<IExternalApiFactory>();
        _externalApiClientMock = new Mock<IExternalApiClient>();
        _instanceIdentifierMock = new Mock<InstanceIdentifier>(1, Guid.NewGuid());
    }

    [Fact]
    public async Task GetExternalApiData_ShouldCallExternalApiClient()
    {
        // Arrange
        string externalApiId = "apiId";
        Dictionary<string, string> queryParams = [];
        var externalApiResultData = new object();

        _externalApiClientMock.SetupGet(c => c.Id).Returns(externalApiId);
        _externalApiClientMock
            .Setup(c => c.GetExternalApiDataAsync(_instanceIdentifierMock.Object, queryParams))
            .ReturnsAsync(externalApiResultData);
        _externalApiFactoryMock
            .Setup(f => f.GetExternalApiClient(externalApiId))
            .Returns(_externalApiClientMock.Object);

        var externalApiService = new ExternalApiService(_loggerMock.Object, _externalApiFactoryMock.Object);

        // Act
        var data = await externalApiService.GetExternalApiData(
            externalApiId,
            _instanceIdentifierMock.Object,
            queryParams
        );

        // Assert
        data.Should().NotBeNull();
        data.Should().BeEquivalentTo(new ExternalApiDataResult(externalApiResultData, true));
        _externalApiClientMock.Verify(
            c => c.GetExternalApiDataAsync(_instanceIdentifierMock.Object, queryParams),
            Times.Once
        );
    }

    [Fact]
    public async Task GetExternalApiData_UnknownApiId_ShouldThrowException()
    {
        // Arrange
        string externalApiId = "unknown";
        Dictionary<string, string> queryParams = [];

        _externalApiFactoryMock.Setup(f => f.GetExternalApiClient(externalApiId)).Returns((IExternalApiClient?)null);
        var externalApiService = new ExternalApiService(_loggerMock.Object, _externalApiFactoryMock.Object);

        // Act
        var result = await externalApiService.GetExternalApiData(
            externalApiId,
            _instanceIdentifierMock.Object,
            queryParams
        );

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEquivalentTo(new ExternalApiDataResult(null, false));
    }

    [Fact]
    public async Task GetExternalApiData_ExternalApiClientThrowsException_ShouldThrowException()
    {
        // Arrange
        string externalApiId = "apiId";
        Dictionary<string, string> queryParams = [];

        _externalApiClientMock.SetupGet(c => c.Id).Returns(externalApiId);
        _externalApiClientMock
            .Setup(c => c.GetExternalApiDataAsync(_instanceIdentifierMock.Object, queryParams))
            .Throws<HttpRequestException>();
        _externalApiFactoryMock
            .Setup(f => f.GetExternalApiClient(externalApiId))
            .Returns(_externalApiClientMock.Object);

        var externalApiService = new ExternalApiService(_loggerMock.Object, _externalApiFactoryMock.Object);

        // Assert
        await Assert.ThrowsAsync<HttpRequestException>(
            async () =>
                await externalApiService.GetExternalApiData(externalApiId, _instanceIdentifierMock.Object, queryParams)
        );
    }
}
