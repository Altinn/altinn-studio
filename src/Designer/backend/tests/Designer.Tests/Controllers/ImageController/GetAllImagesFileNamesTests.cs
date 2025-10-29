#nullable disable
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ImageController;

public class GetAllImagesFileNamesTests : DesignerEndpointsTestsBase<GetAllImagesFileNamesTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string VersionPrefix = "designer/api";
    private const string Org = "ttd";
    private const string App = "app-with-wwwroot-content";
    private const string EmptyApp = "empty-app";

    public GetAllImagesFileNamesTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task GetAllImagesFileNames_ReturnsArrayOfImageFilePathsRelativeFromWwwroot()
    {
        string path = $"{VersionPrefix}/{Org}/{App}/images/fileNames";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<string> responseList = JsonSerializer.Deserialize<List<string>>(responseBody);
        responseList = responseList.Select(filePath => filePath.Replace("\\", "/")).ToList(); // Needed for test to run on Windows
        var expectedFileNames = new List<string> { "ttd.png", "images/patentstyret-varemerke.jpg", "images/images/altinn-logo.svg" };

        Assert.Equal(expectedFileNames, responseList);
    }

    [Fact]
    public async Task GetAllImagesFileNames_WhenNonExists_ReturnsEmptyArray()
    {
        string path = $"{VersionPrefix}/{Org}/{EmptyApp}/images/fileNames";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string responseBody = await response.Content.ReadAsStringAsync();
        List<string> responseList = JsonSerializer.Deserialize<List<string>>(responseBody);
        List<string> expectedFileNames = [];

        Assert.Equal(expectedFileNames, responseList);
    }
}
