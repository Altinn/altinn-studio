using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using VerifyTests;
using VerifyXunit;
using Xunit;

namespace Designer.Tests.Controllers.OrgCodeListController;

public class GetCodeListsNewTests : DesignerEndpointsTestsBase<GetCodeListsNewTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public GetCodeListsNewTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task GetCodeLists_WithValidData_Returns200Ok_With_CodeLists()
    {
        // Arrange
        const string Repo = "org-content-new";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<CodeListData> responseList = JsonSerializer.Deserialize<List<CodeListData>>(responseBody);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(responseList.All(codeListData => codeListData.HasError is false));
        await Verifier.VerifyJson(responseBody, CustomVerifySettings);
    }

    [Fact]
    public async Task GetCodeLists_FormatOrContentIsIllegal_ReturnsHasErrorTrue()
    {
        // Arrange
        const string Repo = "org-content-faulty";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<CodeListData> responseList = JsonSerializer.Deserialize<List<CodeListData>>(responseBody);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(responseList.All(codeListData => codeListData.HasError is true));
        await Verifier.VerifyJson(responseBody, CustomVerifySettings);
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
        List<CodeListData> responseList = JsonSerializer.Deserialize<List<CodeListData>>(responseBody);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(responseList);
    }

    private static string ApiUrl(string targetOrg) => $"designer/api/{targetOrg}/code-lists/new";
}
