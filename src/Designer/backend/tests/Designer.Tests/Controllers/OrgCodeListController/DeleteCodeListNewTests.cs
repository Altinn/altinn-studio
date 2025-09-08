using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using VerifyXunit;
using Xunit;

namespace Designer.Tests.Controllers.OrgCodeListController;

public class DeleteCodeListNewTests : DesignerEndpointsTestsBase<DeleteCodeListNewTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public DeleteCodeListNewTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string Repo = "org-content";
    private const string Developer = "testUser";

    [Fact]
    public async Task Delete_Returns_200OK_When_Deleting_CodeList()
    {
        // Arrange
        const string CodeListId = "codeListNumber";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg, CodeListId);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<CodeListData> responseList = JsonSerializer.Deserialize<List<CodeListData>>(responseBody);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain(responseList, e => e.Title == CodeListId);
        await Verifier.VerifyJson(responseBody, CustomVerifySettings);
    }

    [Fact]
    public async Task Delete_Returns_404NotFound_When_CodeList_Does_Not_Exist()
    {
        // Arrange
        const string CodeListId = "non-existing-code-list";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg, CodeListId);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        JsonDocument responseDocument = JsonDocument.Parse(responseBody);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal($"The code list file {CodeListId}.json does not exist.", responseDocument.RootElement.ToString());
    }

    private static string ApiUrl(string targetOrg, string codeListId) => $"designer/api/{targetOrg}/code-lists/new/{codeListId}";
}
