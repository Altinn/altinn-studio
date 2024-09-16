using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ImageController;

public class UploadImageTests : DesignerEndpointsTestsBase<UploadImageTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string VersionPrefix = "designer/api";
    private const string Org = "ttd";
    private const string App = "app-with-wwwroot-content";
    private const string Developer = "testUser";
    private const string EmptyApp = "empty-app";
    private const string ExistingRootImage = "ttd.png";
    private const string ExistingImageInSubSubFolder = "altinn-logo.svg";
    private const string NotAnImage = "patentstyret-lydmerke.mp3";

    public UploadImageTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task UploadImage_ReturnsOkWithNewImageInRepo()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, EmptyApp, Developer, targetRepository);

        string imagePath = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), Developer, Org, targetRepository, "App", "wwwroot", ExistingRootImage);
        string expectedImageFilePath = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), Developer, Org, App, "App", "wwwroot", ExistingRootImage);

        // Check that image does not exists before uploading
        Assert.False(File.Exists(imagePath), "Image should not exist before upload.");


        byte[] imageBytes = await File.ReadAllBytesAsync(expectedImageFilePath);
        string path = $"{VersionPrefix}/{Org}/{targetRepository}/images";
        var content = new MultipartFormDataContent();
        var imageContent = new ByteArrayContent(imageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(imageContent, "file", ExistingRootImage);
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = content
        };
        await HttpClient.SendAsync(httpRequestMessage);

        // Check that image exists after upload
        Assert.True(File.Exists(imagePath), "Image should exist after upload.");
    }

    [Fact]
    public async Task UploadImage_WhenImageFileNameAlreadyExists_ReturnsBadRequest()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);

        string imagePath = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), Developer, Org, targetRepository, "App", "wwwroot", ExistingRootImage);
        string expectedImageFilePath = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), Developer, Org, App, "App", "wwwroot", ExistingRootImage);

        // Check that image exists before uploading
        Assert.True(File.Exists(imagePath), "Image should exist before upload.");


        byte[] imageBytes = await File.ReadAllBytesAsync(expectedImageFilePath);
        string path = $"{VersionPrefix}/{Org}/{targetRepository}/images";
        var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(imageBytes), "file", ExistingRootImage);
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = content
        };
        var response = await HttpClient.SendAsync(httpRequestMessage);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UploadImage_WhenImageFileNameAlreadyExistsWithOverrideFlagSet_ReturnsOkWithNewImageInRepo()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);

        string imagePath = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), Developer, Org, targetRepository, "App", "wwwroot", ExistingRootImage);
        byte[] imageContentBeforeUpload = await File.ReadAllBytesAsync(imagePath);
        string relativeImageFilePath = Path.Combine("images", "images", ExistingImageInSubSubFolder);
        string imageFilePathForUpload = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), Developer, Org, App, "App", "wwwroot", relativeImageFilePath);

        // Check that image with file name "ExistingRootImage" exists before uploading
        Assert.True(File.Exists(imagePath), "Image should exist before upload.");

        byte[] imageBytes = await File.ReadAllBytesAsync(imageFilePathForUpload);
        string path = $"{VersionPrefix}/{Org}/{targetRepository}/images";
        var content = new MultipartFormDataContent();
        var imageContent = new ByteArrayContent(imageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/svg+xml");
        // Uploading a different image using an existing file name
        content.Add(imageContent, "file", ExistingRootImage);
        content.Add(new StringContent("true"), "overrideExisting");
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = content
        };
        var response = await HttpClient.SendAsync(httpRequestMessage);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Check that new image is replaced with the old image after upload using the same path as above
        byte[] imageContentAfterUpload = await File.ReadAllBytesAsync(imagePath);
        Assert.NotEqual(imageContentBeforeUpload, imageContentAfterUpload);
    }

    [Fact]
    public async Task UploadImage_WhenNotAnImageKindOfFile_ReturnsBadRequest()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);

        string relativeImageFilePath = Path.Combine("assets", NotAnImage);
        string filePathForUpload = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), Developer, Org, App, "App", "wwwroot", relativeImageFilePath);

        byte[] bytes = await File.ReadAllBytesAsync(filePathForUpload);
        string path = $"{VersionPrefix}/{Org}/{targetRepository}/images";
        var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(bytes), "file", NotAnImage);
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = content
        };
        var response = await HttpClient.SendAsync(httpRequestMessage);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
