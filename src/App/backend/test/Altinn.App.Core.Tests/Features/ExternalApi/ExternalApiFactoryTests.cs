using Altinn.App.Core.Features;
using Altinn.App.Core.Features.ExternalApi;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
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
        var services = new ServiceCollection();
        services.AddAppImplementationFactory();
        services.AddSingleton<ExternalApiFactory>();
        using var sp = services.BuildStrictServiceProvider();
        var factory = sp.GetRequiredService<ExternalApiFactory>();

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
        var services = new ServiceCollection();
        services.AddAppImplementationFactory();
        services.AddSingleton<ExternalApiFactory>();
        services.AddSingleton<IExternalApiClient>(_externalApiClientMock.Object);
        using var sp = services.BuildStrictServiceProvider();
        var factory = sp.GetRequiredService<ExternalApiFactory>();

        // Act
        var externalApiClient = factory.GetExternalApiClient("api1");

        // Assert
        externalApiClient?.Should().Be(_externalApiClientMock.Object);
        externalApiClient?.Id.Should().Be("api1");
    }
}
