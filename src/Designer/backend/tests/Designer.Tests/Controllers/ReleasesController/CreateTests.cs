using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ReleasesController;

public class CreateTests : DesignerEndpointsTestsBase<CreateTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string App = "test-app";
    private const string Uri = $"/designer/api/{Org}/{App}/releases";

    private readonly Mock<IReleaseService> _releaseServiceMock = new();

    public CreateTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.AddSingleton<IGiteaClient, IGiteaClientMock>();
        services.AddSingleton(_releaseServiceMock.Object);
    }

    [Theory]
    [InlineData("UnderDevelopment", AppStatus.UnderDevelopment)]
    [InlineData("Completed", AppStatus.Completed)]
    [InlineData(null, null)]
    public async Task Create_PassesAppStatusToReleaseService(string appStatus, AppStatus? expectedAppStatus)
    {
        // Arrange
        _releaseServiceMock
            .Setup(s => s.CreateAsync(It.IsAny<ReleaseEntity>(), It.IsAny<AppStatus?>()))
            .ReturnsAsync(new ReleaseEntity());
        using var httpRequestMessage = CreateReleaseRequest(appStatus);

        // Act
        using var response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        _releaseServiceMock.Verify(
            s => s.CreateAsync(It.Is<ReleaseEntity>(r => r.TagName == "1.0.0"), expectedAppStatus),
            Times.Once
        );
    }

    [Theory]
    [InlineData("Deprecated")]
    [InlineData("Withdrawn")]
    public async Task Create_Returns400BadRequest_WhenAppStatusIsNotAllowed(string appStatus)
    {
        // Arrange
        using var httpRequestMessage = CreateReleaseRequest(appStatus);

        // Act
        using var response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _releaseServiceMock.Verify(s => s.CreateAsync(It.IsAny<ReleaseEntity>(), It.IsAny<AppStatus?>()), Times.Never);
    }

    private static HttpRequestMessage CreateReleaseRequest(string appStatus) =>
        new(HttpMethod.Post, Uri)
        {
            Content = JsonContent.Create(
                new
                {
                    tagName = "1.0.0",
                    name = "1.0.0",
                    body = "",
                    targetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5",
                    appStatus,
                }
            ),
        };
}
