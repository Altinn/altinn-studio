using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OrgCodeListController;

public class UploadCodeListTests : DesignerEndpointsTestsBase<UploadCodeListTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public UploadCodeListTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string Repo = "org-content-empty";
    private const string Developer = "testUser";
    private const string TargetRepository = "ttd-content";
    private const string CodeListFileName = "codeList.json";
    private const string ApiUrl = $"designer/api/{Org}/code-lists/upload";

    [Fact]
    public async Task Post_Returns_200OK_When_Uploading_New_CodeList()
    {
        // Arrange
        await CopyRepositoryForTest(Org, Repo, Developer, TargetRepository);
        const string jsonCodeList = @"[
            {""label"": ""Label1"", ""value"": ""Value1"", ""description"": ""Description1"", ""helpText"": ""helpText"" },
            {""label"": ""Label2"", ""value"": ""Value2"" }
        ]";
        var httpRequestMessage = CreateTestFile(jsonCodeList);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<OptionListData> responseList = JsonSerializer.Deserialize<List<OptionListData>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.NotEmpty(responseList);
        Assert.Equal(2, responseList[0].Data?.Count);
    }

    [Fact]
    public async Task Post_Retuns_200OK_When_Uploading_New_CodeList_With_Empty_Strings()
    {
        // Arrange
        await CopyRepositoryForTest(Org, Repo, Developer, TargetRepository);
        const string jsonCodeList = @"[
            {""label"": """", ""value"": """" },
        ]";
        var httpRequestMessage = CreateTestFile(jsonCodeList);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
    }

    [Fact]
    public async Task Post_Returns_400BadRequest_When_Uploading_New_CodeList_with_Missing_Fields()
    {
        // Arrange
        await CopyRepositoryForTest(Org, Repo, Developer, TargetRepository);
        const string jsonCodeList = @"[
            {""label"": """" },
            {""value"": """" },
        ]";
        var httpRequestMessage = CreateTestFile(jsonCodeList);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
    }

    [Fact]
    public async Task Post_Returns_400BadRequest_When_Uploading_New_CodeList_With_Null_Values()
    {
        // Arrange
        await CopyRepositoryForTest(Org, Repo, Developer, TargetRepository);
        const string jsonCodeList = @"[
            {""label"": null, ""value"": null }
        ]";
        var httpRequestMessage = CreateTestFile(jsonCodeList);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
    }

    [Fact]
    public async Task Post_Returns_400BadRequest_When_Uploading_New_CodeList_With_Invalid_Format()
    {
        // Arrange
        await CopyRepositoryForTest(Org, Repo, Developer, TargetRepository);
        const string jsonCodeList = @"[{""value"": {}, ""label"": """"}]";
        var httpRequestMessage = CreateTestFile(jsonCodeList);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
    }

    private static HttpRequestMessage CreateTestFile(string jsonCodeList)
    {
        byte[] codeListBytes = Encoding.UTF8.GetBytes(jsonCodeList);
        var content = new MultipartFormDataContent();
        var codeListContent = new ByteArrayContent(codeListBytes);
        codeListContent.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        content.Add(codeListContent, "file", CodeListFileName);
        HttpRequestMessage requestMessage = new(HttpMethod.Post, ApiUrl)
        {
            Content = content
        };
        return requestMessage;
    }
}
