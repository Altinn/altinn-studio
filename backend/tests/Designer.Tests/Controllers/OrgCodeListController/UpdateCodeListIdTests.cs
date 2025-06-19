using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OrgCodeListController;

public class UpdateCodeListIdTests : DesignerEndpointsTestsBase<UpdateCodeListIdTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public UpdateCodeListIdTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string Repo = "org-content";

    [Theory]
    [InlineData("codeListString", "new-id")]
    public async Task Put_Returns200Ok_WhenUpdatingCodeListId(string codeListId, string newCodeListId)
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg, codeListId);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content = new StringContent($"\"{newCodeListId}\"", Encoding.UTF8, MediaTypeNames.Application.Json);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string repositoryDir = TestDataHelper.GetTestDataRepositoryDirectory(targetOrg, targetRepository, Developer);
        string oldCodeListFilePath = Path.Join(repositoryDir, CodeListFilePath(codeListId));
        string newCodeListFilePath = Path.Join(repositoryDir, CodeListFilePath(newCodeListId));

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(File.Exists(oldCodeListFilePath));
        Assert.True(File.Exists(newCodeListFilePath));
    }

    [Theory]
    [InlineData("codeListString", "codeListNumber")]
    public async Task Put_Returns409Conflict_WhenUpdatingCodeListId_IfCodeListAlreadyWithNewIdExist(string codeListId, string newCodeListId)
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg, codeListId);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content = new StringContent($"\"{newCodeListId}\"", Encoding.UTF8, MediaTypeNames.Application.Json);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Theory]
    [InlineData("non-existing-code-list", "new-id")]
    public async Task Put_Returns404NotFound_WhenUpdatingCodeListId_IfCodeListDoesNotExist(string codeListId, string newCodeListId)
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg, codeListId);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content = new StringContent($"\"{newCodeListId}\"", Encoding.UTF8, MediaTypeNames.Application.Json);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static string CodeListFilePath(string codeListId) => $"CodeLists/{codeListId}.json";
    private static string ApiUrl(string targetOrg, string codeListId) => $"designer/api/{targetOrg}/code-lists/change-name/{codeListId}";
}
