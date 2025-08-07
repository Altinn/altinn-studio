using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OrgCodeListController;

public class GetCodeListsTests : DesignerEndpointsTestsBase<GetCodeListsTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public GetCodeListsTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task GetCodeLists_Returns200Ok_With_CodeLists()
    {
        // Arrange
        const string Repo = "org-content";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string codeListLabelWithObject = @"[{ ""value"": ""someValue"", ""label"": {}}]";
        string codeListLabelWithNumber = @"[{ ""value"": ""someValue"", ""label"": 12345}]";
        string codeListLabelWithBool = @"[{ ""value"": ""someValue"", ""label"": true}]";
        string repoPath = TestDataHelper.GetRepositoryDirectory(Developer, targetOrg, targetRepository);
        string filePath = Path.Join(repoPath, "CodeLists/");
        await File.WriteAllTextAsync(Path.Join(filePath, "codeListLabelWithObject.json"), codeListLabelWithObject);
        await File.WriteAllTextAsync(Path.Join(filePath, "codeListLabelWithNumber.json"), codeListLabelWithNumber);
        await File.WriteAllTextAsync(Path.Join(filePath, "codeListLabelWithBool.json"), codeListLabelWithBool);

        string apiUrl = ApiUrl(targetOrg);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<OptionListData> responseList = JsonSerializer.Deserialize<List<OptionListData>>(responseBody);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(10, responseList.Count);
        Assert.Single(responseList, e => e.Title == "codeListNumber" && e.HasError == false);
        Assert.Single(responseList, e => e.Title == "codeListString" && e.HasError == false);
        Assert.Single(responseList, e => e.Title == "codeListBoolean" && e.HasError == false);
        Assert.Single(responseList, e => e.Title == "codeListMissingValue" && e.HasError == true);
        Assert.Single(responseList, e => e.Title == "codeListMissingLabel" && e.HasError == true);
        Assert.Single(responseList, e => e.Title == "codeListTrailingComma" && e.HasError == true);
        Assert.Single(responseList, e => e.Title == "codeListLabelWithBool" && e.HasError == true);
        Assert.Single(responseList, e => e.Title == "codeListLabelWithNumber" && e.HasError == true);
        Assert.Single(responseList, e => e.Title == "codeListLabelWithObject" && e.HasError == true);
    }

    [Fact]
    public async Task GetCodeLists_Returns200Ok_With_No_CodeLists()
    {
        // Arrange
        const string Repo = "org-content-empty";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<OptionListData> responseList = JsonSerializer.Deserialize<List<OptionListData>>(responseBody);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(responseList);
        Assert.IsType<List<OptionListData>>(responseList);
    }

    private static string ApiUrl(string targetOrg) => $"designer/api/{targetOrg}/code-lists";
}
