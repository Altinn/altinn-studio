using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.AppDist;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.AppDistController;

public class GetFileTests : DesignerEndpointsTestsBase<GetFileTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Version = "9.0.0";
    private const string LayoutSchemaPath = "schemas/json/layout/layout.schema.v1.json";
    private const string LayoutSchema = """{"$id":"layout"}""";

    private readonly Mock<IAppDistProvider> _appDistProviderMock = new();
    private readonly Mock<IAppDistContent> _contentMock = new();

    public GetFileTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_appDistProviderMock.Object);
    }

    [Fact]
    public async Task GetFile_SchemaPath_ServesFileFromSchemasLayer()
    {
        _appDistProviderMock
            .Setup(p => p.GetLayer(Version, AppDistLayer.Schemas, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_contentMock.Object);
        _contentMock
            .Setup(c => c.OpenFile(LayoutSchemaPath, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new MemoryStream(Encoding.UTF8.GetBytes(LayoutSchema)));

        using HttpResponseMessage response = await HttpClient.GetAsync(FileUrl(Version, LayoutSchemaPath));
        string responseBody = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(LayoutSchema, responseBody);
        Assert.True(response.Headers.CacheControl?.Public);
        Assert.Contains(response.Headers.CacheControl!.Extensions, e => e.Name == "immutable");
    }

    [Fact]
    public async Task GetFile_AnonymousCaller_ServesFile()
    {
        _appDistProviderMock
            .Setup(p => p.GetLayer(Version, AppDistLayer.Content, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_contentMock.Object);
        _contentMock
            .Setup(c => c.OpenFile(FrontendPaths.AltinnAppFrontendStyles, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new MemoryStream(Encoding.UTF8.GetBytes("body{}")));
        using HttpClient anonymousClient = CreateTestClientWithAuthHandler<UnauthenticatedTestAuthHandler>();

        using HttpResponseMessage response = await anonymousClient.GetAsync(
            FileUrl(Version, FrontendPaths.AltinnAppFrontendStyles)
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/css", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("body{}", await response.Content.ReadAsStringAsync());
        Assert.True(response.Headers.CacheControl?.Public);
    }

    [Fact]
    public async Task GetFile_ApiKeyCaller_ServesFile()
    {
        _appDistProviderMock
            .Setup(p => p.GetLayer(Version, AppDistLayer.Content, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_contentMock.Object);
        _contentMock
            .Setup(c => c.OpenFile(FrontendPaths.AltinnAppFrontendJavascript, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new MemoryStream(Encoding.UTF8.GetBytes("console.log(1);")));
        using HttpClient apiKeyClient = CreateTestClientWithAuthHandler<ApiKeyTestAuthHandler>();

        using HttpResponseMessage response = await apiKeyClient.GetAsync(
            FileUrl(Version, FrontendPaths.AltinnAppFrontendJavascript)
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("console.log(1);", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task GetFile_NonSchemaPath_ServesFileFromContentLayer()
    {
        _appDistProviderMock
            .Setup(p => p.GetLayer(Version, AppDistLayer.Content, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_contentMock.Object);
        _contentMock
            .Setup(c => c.OpenFile(FrontendPaths.AltinnAppFrontendJavascript, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new MemoryStream(Encoding.UTF8.GetBytes("console.log(1);")));

        using HttpResponseMessage response = await HttpClient.GetAsync(
            FileUrl(Version, FrontendPaths.AltinnAppFrontendJavascript)
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/javascript", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("console.log(1);", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task GetFile_UnpublishedVersion_ReturnsNotFound()
    {
        _appDistProviderMock
            .Setup(p => p.GetLayer(Version, It.IsAny<AppDistLayer>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IAppDistContent)null);

        using HttpResponseMessage response = await HttpClient.GetAsync(FileUrl(Version, LayoutSchemaPath));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Null(response.Headers.CacheControl);
    }

    [Fact]
    public async Task GetFile_MissingFile_ReturnsNotFound()
    {
        _appDistProviderMock
            .Setup(p => p.GetLayer(Version, AppDistLayer.Schemas, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_contentMock.Object);
        _contentMock
            .Setup(c => c.OpenFile(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new FileNotFoundException());

        using HttpResponseMessage response = await HttpClient.GetAsync(
            FileUrl(Version, "schemas/json/layout/missing.schema.v1.json")
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Null(response.Headers.CacheControl);
    }

    [Theory]
    [InlineData("schemas/json//layout.schema.v1.json")]
    [InlineData("schemas%5Cjson%5Clayout.schema.v1.json")]
    public async Task GetFile_UnsafePath_ReturnsBadRequestWithoutFetching(string filePath)
    {
        using HttpResponseMessage response = await HttpClient.GetAsync(FileUrl(Version, filePath));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _appDistProviderMock.Verify(
            p => p.GetLayer(It.IsAny<string>(), It.IsAny<AppDistLayer>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task GetFile_InvalidVersion_ReturnsBadRequestWithoutFetching()
    {
        using HttpResponseMessage response = await HttpClient.GetAsync(FileUrl("-not-a-tag", LayoutSchemaPath));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _appDistProviderMock.Verify(
            p => p.GetLayer(It.IsAny<string>(), It.IsAny<AppDistLayer>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task GetFile_WhenArtifactIsInvalid_ReturnsBadGateway()
    {
        _appDistProviderMock
            .Setup(p => p.GetLayer(Version, AppDistLayer.Schemas, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AppDistArtifactException("digest mismatch"));

        using HttpResponseMessage response = await HttpClient.GetAsync(FileUrl(Version, LayoutSchemaPath));

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task GetDirectory_VersionRoot_ListsAllFilesFromContentLayer()
    {
        _appDistProviderMock
            .Setup(p => p.GetLayer(Version, AppDistLayer.Content, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_contentMock.Object);
        _contentMock
            .Setup(c => c.ListFiles(It.IsAny<CancellationToken>()))
            .ReturnsAsync(["altinn-app-frontend.js", LayoutSchemaPath]);

        using HttpResponseMessage response = await HttpClient.GetAsync(FileUrl(Version, ""));
        string responseBody = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            ["altinn-app-frontend.js", LayoutSchemaPath],
            JsonSerializer.Deserialize<List<string>>(responseBody)
        );
        Assert.True(response.Headers.CacheControl?.Public);
    }

    [Fact]
    public async Task GetDirectory_SchemaDirectory_ListsMatchingFilesFromSchemasLayer()
    {
        _appDistProviderMock
            .Setup(p => p.GetLayer(Version, AppDistLayer.Schemas, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_contentMock.Object);
        _contentMock
            .Setup(c => c.ListFiles(It.IsAny<CancellationToken>()))
            .ReturnsAsync([LayoutSchemaPath, "schemas/json/component/common-defs.schema.v1.json"]);

        using HttpResponseMessage response = await HttpClient.GetAsync(FileUrl(Version, "schemas/json/layout/"));
        string responseBody = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal([LayoutSchemaPath], JsonSerializer.Deserialize<List<string>>(responseBody));
    }

    [Fact]
    public async Task GetDirectory_UnknownDirectory_ReturnsNotFound()
    {
        _appDistProviderMock
            .Setup(p => p.GetLayer(Version, AppDistLayer.Content, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_contentMock.Object);
        _contentMock.Setup(c => c.ListFiles(It.IsAny<CancellationToken>())).ReturnsAsync([LayoutSchemaPath]);

        using HttpResponseMessage response = await HttpClient.GetAsync(FileUrl(Version, "nope/"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Null(response.Headers.CacheControl);
    }

    private static string FileUrl(string version, string filePath) => $"designer/app-dist/{version}/{filePath}";
}
