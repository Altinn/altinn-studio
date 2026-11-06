using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.TypedHttpClients.PreviewService;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.PreviewSessionsController;

public class StartSessionTests
    : DesignerEndpointsTestsBase<StartSessionTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Url = "/designer/api/ttd/apps-test/preview-sessions";
    private const string SessionUrl = "https://preview.test/0123456789abcdef0123456789abcdef/ttd/apps-test/";

    private readonly Mock<IPreviewServiceClient> _previewServiceClient = new();

    public StartSessionTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_previewServiceClient.Object);
    }

    [Fact]
    public async Task StartSession_ReturnsTheUrlThatPreviewsTheAuthenticatedDevelopersWorkingCopy()
    {
        _previewServiceClient
            .Setup(client => client.StartSession("testUser", "ttd", "apps-test", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Uri(SessionUrl));

        using var request = new HttpRequestMessage(HttpMethod.Post, Url);
        using HttpResponseMessage response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        PreviewSessionResponse body = JsonSerializer.Deserialize<PreviewSessionResponse>(
            await response.Content.ReadAsStringAsync(),
            JsonSerializerOptions
        );
        Assert.Equal(new Uri(SessionUrl), body.Url);
    }

    [Fact]
    public async Task StartSession_WithoutAWorkingCopy_IsNotFound()
    {
        _previewServiceClient
            .Setup(client => client.StartSession("testUser", "ttd", "apps-test", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Uri)null);

        using var request = new HttpRequestMessage(HttpMethod.Post, Url);
        using HttpResponseMessage response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task StartSession_PreviewsOnlyTheAuthenticatedDevelopersOwnWorkingCopy()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, Url + "?developer=otherUser")
        {
            Content = JsonContent.Create(new { developer = "otherUser" }),
        };
        using HttpResponseMessage response = await HttpClient.SendAsync(request);

        _previewServiceClient.Verify(
            client => client.StartSession("testUser", "ttd", "apps-test", It.IsAny<CancellationToken>()),
            Times.Once
        );
        _previewServiceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task StartSession_WithoutAnAntiforgeryToken_IsRefused()
    {
        using HttpClient clientWithoutXsrf = CreateTestClientWithAuthHandler<TestAuthHandler>();

        using var request = new HttpRequestMessage(HttpMethod.Post, Url);
        using HttpResponseMessage response = await clientWithoutXsrf.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _previewServiceClient.VerifyNoOtherCalls();
    }
}
