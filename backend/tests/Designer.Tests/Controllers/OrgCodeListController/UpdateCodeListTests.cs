using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OrgCodeListController;

public class UpdateCodeListTests : DesignerEndpointsTestsBase<UpdateCodeListTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public UpdateCodeListTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string Repo = "org-content-empty";
    private const string Developer = "testUser";
    private const string TargetRepository = "ttd-content";
    private const string CodeListId = "test-code-list";
    private const string ApiUrl = $"designer/api/{Org}/code-lists/{CodeListId}";

    [Fact]
    public async Task Put_Returns_200OK_When_Updating_Code_List()
    {
        // Arrange
        await CopyRepositoryForTest(Org, Repo, Developer, TargetRepository);
        const string stringBoolNumbersCodeList = @"[
            { ""label"": ""StringValue"", ""value"": ""value"" },
            { ""label"": ""BoolValue"", ""value"": true },
            { ""label"": ""NumberValue"", ""value"": 3.1415 },
            { ""label"": ""NumberValue"", ""value"": 1024 },
        ]";
        string repoPath = TestDataHelper.GetTestDataRepositoryDirectory(Org, TargetRepository, "testUser");
        string filePath = Path.Combine(repoPath, "CodeLists/");
        await File.WriteAllTextAsync(Path.Combine(filePath, "stringBoolNumbersCodeList.json"), stringBoolNumbersCodeList);

        const string codeListWithAnUpdate = @"[
            { ""label"": ""aNewLabelThatDidNotExistBefore"", ""value"": ""aNewValueThatDidNotExistBefore"" },
            { ""label"": ""label2"", ""value"": ""value2"" }
        ]";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, ApiUrl);
        httpRequestMessage.Content = new StringContent(codeListWithAnUpdate, Encoding.UTF8, "application/json");
        List<Option> codeList = JsonSerializer.Deserialize<List<Option>>(codeListWithAnUpdate);
        List<OptionListData> expectedResponse = new([
            new OptionListData {Title = CodeListId, Data = codeList, HasError = false}
        ]);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<OptionListData> responseList = JsonSerializer.Deserialize<List<OptionListData>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(expectedResponse[0].Data?.Count, responseList.Count);

        var expectedData = expectedResponse[0].Data;
        var actualData = responseList.Find(e => e.Title == expectedResponse[0].Title).Data;
        for (int i = 0; i < expectedData?.Count; i++)
        {
            Assert.Equal(expectedData[i].Label, actualData?[i].Label);
            Assert.Equal(expectedData[i].Value, actualData?[i].Value);
            Assert.Equal(expectedData[i].Description, actualData?[i].Description);
            Assert.Equal(expectedData[i].HelpText, actualData?[i].HelpText);
        }
    }

    [Fact]
    public async Task Put_Returns_200OK_When_CodeList_Values_Are_Bool_String_Numbers()
    {
        // Arrange
        await CopyRepositoryForTest(Org, Repo, Developer, TargetRepository);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, ApiUrl);
        const string stringBoolNumbersCodeList = @"[
            { ""label"": ""StringValue"", ""value"": ""value"" },
            { ""label"": ""BoolValue"", ""value"": true },
            { ""label"": ""NumberValue"", ""value"": 3.1415 },
            { ""label"": ""NumberValue"", ""value"": 1024 },
        ]";
        httpRequestMessage.Content = new StringContent(stringBoolNumbersCodeList, Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
    }

    [Fact]
    public async Task Put_Returns_400BadRequest_When_CodeList_Is_Empty()
    {
        // Arrange
        await CopyRepositoryForTest(Org, Repo, Developer, TargetRepository);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, ApiUrl);
        httpRequestMessage.Content = new StringContent("null", Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseContent = await response.Content.ReadAsStringAsync();
        var responseObject = JsonSerializer.Deserialize<JsonElement>(responseContent);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
        Assert.True(responseObject.TryGetProperty("errors", out JsonElement errors));
        Assert.True(errors.TryGetProperty("", out JsonElement labelErrors));
        Assert.Contains("A non-empty request body is required.", labelErrors[0].GetString());
    }

    [Fact]
    public async Task Put_Returns_400BadRequest_When_CodeList_Has_Invalid_Format()
    {
        // Arrange
        await CopyRepositoryForTest(Org, Repo, Developer, TargetRepository);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, ApiUrl);
        const string invalidCodeList = @"[
            { ""value"": {}, ""label"": ""label2"" },
        ]";
        httpRequestMessage.Content = new StringContent(invalidCodeList, Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        var problemDetails = JsonSerializer.Deserialize<ProblemDetails>(await response.Content.ReadAsStringAsync());

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
        Assert.NotNull(problemDetails);
        JsonElement errorCode = (JsonElement)problemDetails.Extensions[ProblemDetailsExtensionsCodes.ErrorCode];
        Assert.Equal("InvalidOptionsFormat", errorCode.ToString());
    }

    [Fact]
    public async Task Put_Returns_400BadRequest_When_CodeList_Has_Missing_Required_Fields()
    {
        // Arrange
        await CopyRepositoryForTest(Org, Repo, Developer, TargetRepository);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, ApiUrl);
        const string codeListWithMissingFields = @"[
            { ""value"": ""value1"" },
            { ""label"": ""label2"" },
            { ""value"": null, ""label"": null },
        ]";
        httpRequestMessage.Content = new StringContent(codeListWithMissingFields, Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseContent = await response.Content.ReadAsStringAsync();
        var responseObject = JsonSerializer.Deserialize<JsonElement>(responseContent);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
        Assert.True(responseObject.TryGetProperty("errors", out JsonElement errors));

        Assert.True(errors.TryGetProperty("[0].Label", out JsonElement labelErrors));
        Assert.Contains("The field is required.", labelErrors[0].GetString());

        Assert.True(errors.TryGetProperty("[1].Value", out JsonElement valueErrors));
        Assert.Contains("The field is required.", valueErrors[0].GetString());

        Assert.True(errors.TryGetProperty("[2].Value", out JsonElement valueNullErrors));
        Assert.Contains("The field is required.", valueNullErrors[0].GetString());
        Assert.True(errors.TryGetProperty("[2].Label", out JsonElement labelNullErrors));
        Assert.Contains("The field is required.", labelNullErrors[0].GetString());
    }
}
