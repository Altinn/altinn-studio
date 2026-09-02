using System.Net;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivInstanceClientTest
{
    private readonly InstanceIdentifier _defaultInstanceIdentifier = new($"12345/{Guid.NewGuid()}");

    [Fact]
    public async Task GetServiceOwnerToken_CallsTokenResolver()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
        });

        // Act
        var result = await fixture.FiksArkivInstanceClient.GetServiceOwnerToken();

        // Assert
        Assert.Equal(TestHelpers.DummyToken, result.Value);
    }

    [Fact]
    public async Task MarkInstanceComplete_CallsCorrectEndpoint()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services => services.AddFiksArkiv());
        List<HttpRequestMessage> requests = [];
        var httpClient = TestHelpers.GetHttpClientWithMockedHandlerFactory(
            HttpStatusCode.OK,
            requestCallback: request => requests.Add(request)
        );
        fixture.HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        // Act
        await fixture.FiksArkivInstanceClient.MarkInstanceComplete(_defaultInstanceIdentifier);

        // Assert
        HttpRequestMessage markCompletedRequest = requests.Last();

        Assert.Equal(HttpMethod.Post, markCompletedRequest.Method);
        Assert.Equal($"Bearer {TestHelpers.DummyToken}", markCompletedRequest.Headers.Authorization!.ToString());
        Assert.Equal(
            $"http://localhost:5101/storage/api/v1/instances/{_defaultInstanceIdentifier}/complete",
            markCompletedRequest.RequestUri!.ToString()
        );
    }

    [Fact]
    public async Task MarkInstanceComplete_ThrowsException_ForInvalidResponse()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services => services.AddFiksArkiv());
        var httpClient = TestHelpers.GetHttpClientWithMockedHandlerFactory(HttpStatusCode.Forbidden);
        fixture.HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        // Act
        var record = await Record.ExceptionAsync(() =>
            fixture.FiksArkivInstanceClient.MarkInstanceComplete(_defaultInstanceIdentifier)
        );

        // Assert
        Assert.IsType<PlatformHttpException>(record);
        Assert.Equal(HttpStatusCode.Forbidden, ((PlatformHttpException)record).Response.StatusCode);
    }
}
