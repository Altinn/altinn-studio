using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
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
    private const string Repo = "org-content";
    private const string Developer = "testUser";
    private const string CodeListId = "codeListString";

    [Fact]
    public async Task Put_Returns_200OK_When_Updating_Code_List()
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        const string CodeListWithAnUpdate = @"[
            { ""label"": ""aNewLabelThatDidNotExistBefore"", ""value"": ""aNewValueThatDidNotExistBefore"" },
            { ""label"": ""label2"", ""value"": ""value2"" }
        ]";
        httpRequestMessage.Content = new StringContent(CodeListWithAnUpdate, Encoding.UTF8, "application/json");
        List<Option> codeList = JsonSerializer.Deserialize<List<Option>>(CodeListWithAnUpdate);
        List<OptionListData> expectedResponse = new([
            new OptionListData {Title = CodeListId, Data = codeList, HasError = false}
        ]);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<OptionListData> responseList = JsonSerializer.Deserialize<List<OptionListData>>(responseBody);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(expectedResponse[0].Data?.Count, responseList[0].Data?.Count);

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
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        const string StringBoolNumbersCodeList = @"[
            { ""label"": ""StringValue"", ""value"": ""value"" },
            { ""label"": ""BoolValue"", ""value"": true },
            { ""label"": ""NumberValue"", ""value"": 3.1415 },
            { ""label"": ""NumberValue"", ""value"": 1024 },
        ]";
        httpRequestMessage.Content = new StringContent(StringBoolNumbersCodeList, Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Put_Returns_400BadRequest_When_CodeList_Is_Empty()
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content = new StringContent("null", Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseContent = await response.Content.ReadAsStringAsync();
        var responseObject = JsonSerializer.Deserialize<JsonElement>(responseContent);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(responseObject.TryGetProperty("errors", out JsonElement errors));
        Assert.True(errors.TryGetProperty("", out JsonElement labelErrors));
        Assert.Contains("A non-empty request body is required.", labelErrors[0].GetString());
    }

    [Fact]
    public async Task Put_Returns_400BadRequest_When_CodeList_Has_Invalid_Format()
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        const string InvalidCodeList = @"[
            { ""value"": {}, ""label"": ""label2"" },
        ]";
        httpRequestMessage.Content = new StringContent(InvalidCodeList, Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        var problemDetails = JsonSerializer.Deserialize<ProblemDetails>(await response.Content.ReadAsStringAsync());

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.NotNull(problemDetails);
        JsonElement errorCode = (JsonElement)problemDetails.Extensions[ProblemDetailsExtensionsCodes.ErrorCode];
        Assert.Equal("InvalidOptionsFormat", errorCode.ToString());
    }

    [Fact]
    public async Task Put_Returns_400BadRequest_When_CodeList_Has_Missing_Required_Fields()
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        const string CodeListWithMissingFields = @"[
            { ""value"": ""value1"" },
            { ""label"": ""label2"" },
            { ""value"": null, ""label"": null },
        ]";
        httpRequestMessage.Content = new StringContent(CodeListWithMissingFields, Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseContent = await response.Content.ReadAsStringAsync();
        var responseObject = JsonSerializer.Deserialize<JsonElement>(responseContent);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
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

    private static string ApiUrl(string targetOrg) => $"designer/api/{targetOrg}/code-lists/{CodeListId}";
}
