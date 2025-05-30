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
    private const string CodeListId = "codeListString";

    [Fact]
    public async Task Put_Returns200Ok_WhenUpdatingCodeListId()
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        const string NewCodeListId = "new-id";
        httpRequestMessage.Content = new StringContent($"\"{NewCodeListId}\"", Encoding.UTF8, MediaTypeNames.Application.Json);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string repositoryDir = TestDataHelper.GetTestDataRepositoryDirectory(targetOrg, targetRepository, Developer);
        string oldCodeListFilePath = Path.Combine(repositoryDir, $"Codelists/{CodeListId}.json");
        string newCodeListFilePath = Path.Combine(repositoryDir, $"Codelists/{NewCodeListId}.json");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(File.Exists(oldCodeListFilePath));
        Assert.True(File.Exists(newCodeListFilePath));
    }

    private static string ApiUrl(string targetOrg) => $"designer/api/{targetOrg}/code-lists/change-name/{CodeListId}";
}
