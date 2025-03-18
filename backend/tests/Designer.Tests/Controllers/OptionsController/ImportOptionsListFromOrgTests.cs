using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class ImportOptionsListFromOrgTests : DesignerEndpointsTestsBase<ImportOptionsListFromOrgTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public ImportOptionsListFromOrgTests(WebApplicationFactory<Program> fixture) : base(fixture)
    {
    }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task Post_Returns_200OK_When_Importing_CodeList_From_Org()
    {
        // Arrange
        const string orgRepo = "org-content";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, orgRepo, targetOrg, targetOrgRepository);

        const string appRepo = "app-with-options";
        string targetAppRepository = TestDataHelper.GenerateTestRepoName();
        await AddRepositoryToTestOrg(Developer, Org, appRepo, targetOrg, targetAppRepository);

        const string optionListId = "codeListString";
        string apiUrl = $"/designer/api/{targetOrg}/{targetAppRepository}/options/{optionListId}/import";
        using HttpRequestMessage message = new(HttpMethod.Post, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(message);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
