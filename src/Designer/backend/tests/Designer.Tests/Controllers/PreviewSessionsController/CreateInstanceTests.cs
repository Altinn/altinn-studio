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

public class CreateInstanceTests
    : DesignerEndpointsTestsBase<CreateInstanceTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Url = "/designer/api/ttd/apps-test/preview-sessions/instances";
    private const string SessionUrl = "https://preview.test/0123456789abcdef0123456789abcdef/ttd/apps-test/";

    private readonly Mock<IPreviewServiceClient> _previewServiceClient = new();

    public CreateInstanceTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_previewServiceClient.Object);
    }

    [Fact]
    public async Task CreateInstance_ReturnsTheInstanceInTheAuthenticatedDevelopersSession()
    {
        _previewServiceClient
            .Setup(client =>
                client.CreateInstance(
                    "testUser",
                    "ttd",
                    "apps-test",
                    new Uri(SessionUrl),
                    "Task_1",
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync("51001/7b1b0d6c-1d4e-4c1f-9d0a-2b9b8e1f2a3c");

        using HttpResponseMessage response = await Post(new { sessionUrl = SessionUrl, taskId = "Task_1" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        PreviewInstanceResponse body = JsonSerializer.Deserialize<PreviewInstanceResponse>(
            await response.Content.ReadAsStringAsync(),
            JsonSerializerOptions
        );
        Assert.Equal("51001/7b1b0d6c-1d4e-4c1f-9d0a-2b9b8e1f2a3c", body.InstanceId);
    }

    [Fact]
    public async Task CreateInstance_WithoutTheSession_IsNotFound()
    {
        _previewServiceClient
            .Setup(client =>
                client.CreateInstance(
                    "testUser",
                    "ttd",
                    "apps-test",
                    new Uri(SessionUrl),
                    "Task_1",
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((string)null);

        using HttpResponseMessage response = await Post(new { sessionUrl = SessionUrl, taskId = "Task_1" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("../Task_1")]
    [InlineData("")]
    public async Task CreateInstance_RefusesATaskThatIsNotAName(string taskId)
    {
        using HttpResponseMessage response = await Post(new { sessionUrl = SessionUrl, taskId });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _previewServiceClient.VerifyNoOtherCalls();
    }

    private Task<HttpResponseMessage> Post(object body) => HttpClient.PostAsJsonAsync(Url, body);
}
