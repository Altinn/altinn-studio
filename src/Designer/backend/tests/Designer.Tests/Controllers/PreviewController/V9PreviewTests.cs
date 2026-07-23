using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController;

/// <summary>
/// Tests for the v9 preview flow: Designer generates the index HTML with the injected bootstrap state,
/// serves it for app-frontend's client-side routes, and enriches the instance with process tasks.
/// </summary>
public class V9PreviewTests : PreviewControllerTestsBase<V9PreviewTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IAppVersionService> _appVersionServiceMock = new();

    public V9PreviewTests(WebApplicationFactory<Program> factory)
        : base(factory)
    {
        _appVersionServiceMock.Setup(s => s.IsV9App(It.IsAny<AltinnRepoEditingContext>())).Returns(true);
        _appVersionServiceMock
            .Setup(s => s.GetAppLibVersion(It.IsAny<AltinnRepoEditingContext>()))
            .Returns(NuGet.Versioning.NuGetVersion.Parse("9.0.0"));
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c => c.RepositoryLocation = TestRepositoriesLocation);
        services.Configure<SharedContentClientSettings>(c =>
        {
            c.StorageAccountUrl = "http://test.no";
            c.StorageContainerName = "storageAccountName";
        });
        services.AddSingleton<IGiteaClient, IGiteaClientMock>();
        services.AddSingleton(_appVersionServiceMock.Object);
        services.AddDistributedMemoryCache();
    }

    [Fact]
    public async Task AppFrontendSpecificPreview_ForV9App_GeneratesIndexHtmlWithBootstrap()
    {
        string url = $"/app-specific-preview/{Org}/{AppV9}";
        using HttpRequestMessage request = new(HttpMethod.Get, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);

        string body = await response.Content.ReadAsStringAsync();
        Assert.Contains("<div id=\"root\"></div>", body);
        Assert.Contains($"window.org = '{Org}';", body);
        Assert.Contains($"window.app = '{AppV9}';", body);
        Assert.Contains("window.altinnAppGlobalData = ", body);
        // Designer self-hosts the bundle (no CDN).
        Assert.Contains("/altinn-app-frontend/altinn-app-frontend.js", body);
        Assert.Contains("/altinn-app-frontend/altinn-app-frontend.css", body);
        // The v9 test app has no onEntry, so it must be defaulted to keep app-frontend from crashing.
        Assert.Contains("\"onEntry\":{\"show\":\"new-instance\"}", body);
    }

    [Fact]
    public async Task V9PreviewClientRoute_ForV9App_ServesGeneratedHtml()
    {
        // A client-side (history) route the app-frontend browser router lands on after the hash redirect.
        string url = $"/{Org}/{AppV9}/instance/{PartyId}/{V3InstanceId}/Task_1/Page1";
        using HttpRequestMessage request = new(HttpMethod.Get, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("<div id=\"root\"></div>", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task V9PreviewClientRoute_ForNonV9App_ReturnsNotFound()
    {
        _appVersionServiceMock.Setup(s => s.IsV9App(It.IsAny<AltinnRepoEditingContext>())).Returns(false);

        string url = $"/{Org}/{AppV4}/instance/{PartyId}/{V3InstanceId}/Task_1/Page1";
        using HttpRequestMessage request = new(HttpMethod.Get, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetEnrichedInstance_ForV9App_IncludesProcessTasksForCurrentTask()
    {
        string createUrl = $"{Org}/{AppV9}/instances?instanceOwnerPartyId={PartyId}&taskId=Task_1";
        using HttpRequestMessage createRequest = new(HttpMethod.Post, createUrl);
        using HttpResponseMessage createResponse = await HttpClient.SendAsync(createRequest);
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        Instance instance = JsonSerializer.Deserialize<Instance>(
            await createResponse.Content.ReadAsStringAsync(),
            JsonSerializerOptions
        );
        Assert.NotNull(instance);

        string enrichedUrl = $"{Org}/{AppV9}/instances/{PartyId}/{instance.Id}/enriched";
        using HttpRequestMessage enrichedRequest = new(HttpMethod.Get, enrichedUrl);
        using HttpResponseMessage enrichedResponse = await HttpClient.SendAsync(enrichedRequest);

        Assert.Equal(HttpStatusCode.OK, enrichedResponse.StatusCode);
        JsonNode enriched = JsonNode.Parse(await enrichedResponse.Content.ReadAsStringAsync());
        JsonArray processTasks = enriched?["process"]?["processTasks"] as JsonArray;

        Assert.NotNull(processTasks);
        Assert.Equal("Task_1", processTasks[0]?["elementId"]?.GetValue<string>());
    }
}
