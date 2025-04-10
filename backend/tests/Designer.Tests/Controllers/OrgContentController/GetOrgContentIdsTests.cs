using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OrgContentController;

public class GetOrgContentIdsTests : DesignerEndpointsTestsBase<GetOrgContentIdsTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public GetOrgContentIdsTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task GetOrgContentIds_GivenCodeListParameter_ShouldReturnOkWithCodeListIds()
    {
        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        const LibraryContentType resourceType = LibraryContentType.CodeList;
        string apiUrlWithCodeListParameter = $"{apiBaseUrl}/{resourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithCodeListParameter);

        var response = await HttpClient.SendAsync(request);

        List<string> codeLists = await response.Content.ReadAsAsync<List<string>>();
        Assert.Equal(6, codeLists.Count);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetOrgContentIds_GivenTextResourceParameter_ShouldReturnOkWithTextResourceIds()
    {
        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        const LibraryContentType resourceType = LibraryContentType.TextResource;
        string apiUrlWithTextResourceParameter = $"{apiBaseUrl}/{resourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithTextResourceParameter);

        var response = await HttpClient.SendAsync(request);

        List<string> textResources = await response.Content.ReadAsAsync<List<string>>();
        Assert.Equal(2, textResources.Count);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetOrgContentIds_GivenValidTypeParameterInMixedCaseString_ShouldReturnOkWithContent()
    {
        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        const string resourceType = "textRESOURCE";
        string apiUrlWithTextResourceParameter = $"{apiBaseUrl}/{resourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithTextResourceParameter);

        var response = await HttpClient.SendAsync(request);

        List<string> textResources = await response.Content.ReadAsAsync<List<string>>();
        Assert.Equal(2, textResources.Count);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetOrgContentIds_GivenInvalidOrg_ShouldReturnNoContentWithHeaderMessage()
    {
        string apiBaseUrl = new Organisation("invalidOrg").ApiBaseUrl;
        const LibraryContentType resourceType = LibraryContentType.CodeList;
        string  apiUrlWithTextInvalidOrg = $"{apiBaseUrl}/{resourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithTextInvalidOrg);

        var response = await HttpClient.SendAsync(request);

        var responseHeaderReasonMessage = response.Headers.GetValues("Reason");
        Assert.NotNull(responseHeaderReasonMessage);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task GetOrgContentIds_GivenInvalidTypeParameter_ShouldReturnBadRequest()
    {
        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        const string invalidResourceType = "invalidResourceType";
        string apiUrlWithInvalidResourceType = $"{apiBaseUrl}/{invalidResourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithInvalidResourceType);

        var response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<OrgAndRepoName> CreateOrgWithRepository()
    {
        OrgAndRepoName orgAndRepoName = GenerateOrgAndRepoNames();
        await CreateTestRepository(orgAndRepoName);
        return orgAndRepoName;
    }

    private static OrgAndRepoName GenerateOrgAndRepoNames()
    {
        string targetOrgName = TestDataHelper.GenerateTestOrgName();
        string targetRepoName = TestDataHelper.GetOrgContentRepoName(targetOrgName);

        return new OrgAndRepoName(targetOrgName, targetRepoName);
    }

    private async Task CreateTestRepository(OrgAndRepoName orgAndRepoName)
    {
        const string username = "testUser";
        const string orgName = "ttd";
        const string repoName = "org-content";
        await CopyOrgRepositoryForTest(
            username,
            orgName,
            repoName,
            orgAndRepoName.Org.Name,
            orgAndRepoName.RepoName
        );
    }

    private class OrgAndRepoName(string orgName, string repoName)
    {
        public Organisation Org { get; } = new(orgName);
        public string RepoName { get; } = repoName;
    }

    private class Organisation(string name)
    {
        public string Name { get; } = name;
        public string ApiBaseUrl => $"designer/api/{Name}/content";
    }
}
