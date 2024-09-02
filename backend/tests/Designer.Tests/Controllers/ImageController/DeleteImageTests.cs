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

public class DeleteImageTests : DesignerEndpointsTestsBase<DeleteImageTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string VersionPrefix = "designer/api";
    private const string Org = "ttd";
    private const string App = "app-with-wwwroot-content";
    private const string Developer = "testUser";
    private const string ExistingRootImage = "ttd.png";
    private const string ExistingImageInSubSubFolder = "altinn-logo.svg";
    private const string NonExistingImage = "non-existing-image.png";

    public DeleteImageTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task DeleteImage_ReturnsOkAndImageIsDeletedFromRepo()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);

        string imagePath = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), Developer, Org, targetRepository, "App", "wwwroot", ExistingRootImage);

        // Check that image exists before deletion
        Assert.True(File.Exists(imagePath), "Image should exist before deletion.");

        string path = $"{VersionPrefix}/{Org}/{targetRepository}/images/{ExistingRootImage}";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, path);
        await HttpClient.SendAsync(httpRequestMessage);

        // Check that image is deleted from targetRepository
        Assert.False(File.Exists(imagePath), "Image should be deleted after the request.");
    }

    [Fact]
    public async Task DeleteImage_WhenImageExistsInSubFolder_ReturnsOkAndImageIsDeletedFromRepo()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);

        string relativeImageFilePath = Path.Combine("images", "images", ExistingImageInSubSubFolder);

        string imagePath = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), Developer, Org, targetRepository, "App", "wwwroot", relativeImageFilePath);

        // Check that image exists before deletion
        Assert.True(File.Exists(imagePath), "Image should exist before deletion.");

        string encodedImageFilePath = Uri.EscapeDataString(relativeImageFilePath).Replace("/", "%2F");

        string path = $"{VersionPrefix}/{Org}/{targetRepository}/images/{encodedImageFilePath}";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, path);
        await HttpClient.SendAsync(httpRequestMessage);

        // Check that image is deleted from targetRepository
        Assert.False(File.Exists(imagePath), "Image should be deleted after the request.");
    }

    [Fact]
    public async Task DeleteImage_WhenDoesNotExist_ReturnsOk()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);

        string imagePath = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), Developer, Org, targetRepository, "App", "wwwroot", NonExistingImage);

        // Check that image does not exist before deletion
        Assert.False(File.Exists(imagePath), "Image should not exist before deletion.");

        string path = $"{VersionPrefix}/{Org}/{targetRepository}/images/{NonExistingImage}";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
