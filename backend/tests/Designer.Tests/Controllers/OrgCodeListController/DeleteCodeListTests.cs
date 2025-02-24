using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OrgCodeListController;

public class DeleteCodeListTests : DesignerEndpointsTestsBase<DeleteCodeListTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public DeleteCodeListTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string Repo = "org-content";
    private const string Developer = "testUser";

    [Fact]
    public async Task Delete_Returns_200OK_When_Deleting_CodeList()
    {
        // Arrange
        const string codeListId = "codeListNumber";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string apiUrl = $"/designer/api/{targetOrg}/code-lists/{codeListId}";
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<OptionListData> responseList = JsonSerializer.Deserialize<List<OptionListData>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(5, responseList.Count);
        Assert.DoesNotContain(responseList, e => e.Title == codeListId);
    }

    [Fact]
    public async Task Delete_Returns_200OK_When_CodeList_Does_Not_Exist()
    {
        // Arrange
        const string codeListId = "non-existing-code-list";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string apiUrl = $"/designer/api/{targetOrg}/code-lists/{codeListId}";
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        JsonDocument responseDocument = JsonDocument.Parse(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status404NotFound, (int)response.StatusCode);
        Assert.Equal($"The code list file {codeListId}.json does not exist.", responseDocument.RootElement.ToString());
    }
}
