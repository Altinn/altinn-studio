using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ImageController;

public class GetImageByNameTests : DesignerEndpointsTestsBase<GetImageByNameTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string VersionPrefix = "designer/api";
    private const string Org = "ttd";
    private const string App = "app-with-wwwroot-content";
    private const string Developer = "testUser";
    private const string ExistingRootImage = "ttd.png";
    private const string ExistingImageInSubSubFolder = "altinn-logo.svg";
    private const string NonExistingImage = "non-existing-image.png";

    public GetImageByNameTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task GetImageByName_ReturnsImageAsFileStreamResult()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);

        string imagePath = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), Developer, Org, targetRepository, "App", "wwwroot", ExistingRootImage);
        byte[] expectedImageContent = await File.ReadAllBytesAsync(imagePath);

        string path = $"{VersionPrefix}/{Org}/{targetRepository}/images/{ExistingRootImage}";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        byte[] actualImageContent = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal(expectedImageContent, actualImageContent);
    }

    [Fact]
    public async Task GetImageByName_WhenImageExistsInSubFolder_ReturnsImageAsFileStreamResult()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);

        string relativeImageFilePath = Path.Combine("images", "images", ExistingImageInSubSubFolder);
        string imagePath = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), Developer, Org, targetRepository, "App", "wwwroot", relativeImageFilePath);
        byte[] expectedImageContent = await File.ReadAllBytesAsync(imagePath);

        string encodedImageFilePath = Uri.EscapeDataString(relativeImageFilePath).Replace("/", "%2F");
        string path = $"{VersionPrefix}/{Org}/{targetRepository}/images/{encodedImageFilePath}";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        byte[] actualImageContent = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal(expectedImageContent, actualImageContent);
    }

    [Fact]
    public async Task GetImageByName_WhenDoesNotExist_ReturnsNotFound()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);

        string path = $"{VersionPrefix}/{Org}/{targetRepository}/images/{NonExistingImage}";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
