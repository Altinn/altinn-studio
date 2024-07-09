using Altinn.App.Core.Features.ExternalApi;
using FluentAssertions;
using Moq;

namespace Altinn.App.Core.Tests.Features.ExternalApi;

public class ExternalApiFactoryTests
{
    private readonly Mock<IExternalApiClient> _externalApiClientMock;

    public ExternalApiFactoryTests()
    {
        _externalApiClientMock = new Mock<IExternalApiClient>();
    }

    [Fact]
    public void GetExternalApiClient_UnknownApiId_ShouldThrowException()
    {
        // Arrange
        var factory = new ExternalApiFactory([]);

        // Act
        var externalApiClient = factory.GetExternalApiClient("unknown");

        // Assert
        externalApiClient.Should().BeNull();
    }

    [Fact]
    public void GetExternalApiClient_ExistingApiId_ShouldReturnClient()
    {
        // Arrange
        _externalApiClientMock.SetupGet(x => x.Id).Returns("api1");
        var factory = new ExternalApiFactory([_externalApiClientMock.Object]);

        // Act
        var externalApiClient = factory.GetExternalApiClient("api1");

        // Assert
        externalApiClient?.Should().Be(_externalApiClientMock.Object);
        externalApiClient?.Id.Should().Be("api1");
    }
}
