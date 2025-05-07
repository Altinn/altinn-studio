using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class UploadOptionsTests : DesignerEndpointsTestsBase<UploadOptionsTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public UploadOptionsTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string VersionPrefix = "designer/api";
    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task Post_Returns_200OK_When_Uploading_New_OptionsList()
    {
        // Arrange
        const string Repo = "empty-app";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        string optionsFileName = "options.json";
        string jsonOptions = @"[
        {""label"": ""Label1"", ""value"": ""Value1"", ""description"": ""Description1"", ""helpText"": ""helpText"" },
        {""label"": ""Label2"", ""value"": ""Value2"" }
    ]";

        byte[] optionsBytes = Encoding.UTF8.GetBytes(jsonOptions);
        string apiUrl = $"{VersionPrefix}/{Org}/{targetRepository}/options/upload";
        var content = new MultipartFormDataContent();
        var optionsContent = new ByteArrayContent(optionsBytes);
        optionsContent.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        content.Add(optionsContent, "file", optionsFileName);
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, apiUrl)
        {
            Content = content
        };

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        var responseList = JsonSerializer.Deserialize<List<Option>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(2, responseList.Count);
    }

    [Fact]
    public async Task Post_Returns_200OK_When_Uploading_New_OptionsList_With_Empty_Strings()
    {
        // Arrange
        const string Repo = "empty-app";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        string optionsFileName = "simple-options.json";
        string jsonOptions = @"[
        {""label"": """", ""value"": """" },
    ]";

        byte[] optionsBytes = Encoding.UTF8.GetBytes(jsonOptions);
        string apiUrl = $"{VersionPrefix}/{Org}/{targetRepository}/options/upload";
        var content = new MultipartFormDataContent();
        var optionsContent = new ByteArrayContent(optionsBytes);
        optionsContent.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        content.Add(optionsContent, "file", optionsFileName);
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, apiUrl)
        {
            Content = content
        };

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
    }

    [Fact]
    public async Task Post_Returns_400BadRequest_When_Uploading_New_OptionsList_With_Missing_Fields()
    {
        // Arrange
        const string Repo = "empty-app";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        string optionsFileName = "missing-fields-options.json";
        string jsonOptions = @"[
        {""value"": """" },
        {""label"": """" },
    ]";

        byte[] optionsBytes = Encoding.UTF8.GetBytes(jsonOptions);
        string apiUrl = $"{VersionPrefix}/{Org}/{targetRepository}/options/upload";
        var content = new MultipartFormDataContent();
        var optionsContent = new ByteArrayContent(optionsBytes);
        optionsContent.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        content.Add(optionsContent, "file", optionsFileName);
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, apiUrl)
        {
            Content = content
        };

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
    }

    [Fact]
    public async Task Post_Returns_400BadRequest_When_Uploading_New_OptionsList_With_Null_Values()
    {
        // Arrange
        const string Repo = "empty-app";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        string optionsFileName = "null-options.json";
        string jsonOptions = @"[
        {""label"": null, ""value"": null }
    ]";

        byte[] optionsBytes = Encoding.UTF8.GetBytes(jsonOptions);
        string apiUrl = $"{VersionPrefix}/{Org}/{targetRepository}/options/upload";
        var content = new MultipartFormDataContent();
        var optionsContent = new ByteArrayContent(optionsBytes);
        optionsContent.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        content.Add(optionsContent, "file", optionsFileName);
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, apiUrl)
        {
            Content = content
        };

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
    }

    [Fact]
    public async Task Post_Returns_400BadRequest_When_Uploading_New_OptionsList_With_Invalid_Format()
    {
        // Arrange
        const string Repo = "empty-app";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        string optionsFileName = "invalid-value-options.json";
        string jsonOptions = @"[{""value"": {}, ""label"": """"}]";

        byte[] optionsBytes = Encoding.UTF8.GetBytes(jsonOptions);
        string apiUrl = $"{VersionPrefix}/{Org}/{targetRepository}/options/upload";
        var content = new MultipartFormDataContent();
        var optionsContent = new ByteArrayContent(optionsBytes);
        optionsContent.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        content.Add(optionsContent, "file", optionsFileName);
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, apiUrl)
        {
            Content = content
        };

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);

        var problemDetails = JsonSerializer.Deserialize<ProblemDetails>(await response.Content.ReadAsStringAsync());
        Assert.NotNull(problemDetails);
        JsonElement errorCode = (JsonElement)problemDetails.Extensions[ProblemDetailsExtensionsCodes.ErrorCode];
        Assert.Equal("InvalidOptionsFormat", errorCode.ToString());
    }
}
