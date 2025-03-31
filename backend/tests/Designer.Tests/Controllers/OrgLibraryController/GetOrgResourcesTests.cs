using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OrgLibraryController;

public class GetOrgResourcesTests : DesignerEndpointsTestsBase<GetOrgResourcesTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public GetOrgResourcesTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task GetOrgResources_GivenCodeListParameter_ShouldReturnOkWithCodeLists()
    {
        string apiBaseUrl = await PrepareOrgForTest();
        const LibraryResourceType resourceType = LibraryResourceType.CodeList;
        string apiUrlWithCodeListParameter = $"{apiBaseUrl}/{resourceType}";
        var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithCodeListParameter);

        var response = await HttpClient.SendAsync(request);
        List<string> codeLists = await response.Content.ReadAsAsync<List<string>>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(6, codeLists.Count);
    }

    [Fact]
    public async Task GetOrgResources_GivenTextResourceParameter_ShouldReturnOkWithTextResources()
    {
        string apiBaseUrl = await PrepareOrgForTest();
        const LibraryResourceType resourceType = LibraryResourceType.TextResource;
        string apiUrlWithTextResourceParameter = $"{apiBaseUrl}/{resourceType}";
        var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithTextResourceParameter);

        var response = await HttpClient.SendAsync(request);
        List<string> textResources = await response.Content.ReadAsAsync<List<string>>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, textResources.Count);
    }

    [Fact]
    public async Task GetOrgResources_GivenInvalidTypeParameter_ShouldReturnBadRequest()
    {
        string apiBaseUrl = await PrepareOrgForTest();
        const string invalidResourceType = "invalidResourceType";
        string apiUrlWithInvalidResourceType = $"{apiBaseUrl}/{invalidResourceType}";
        var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithInvalidResourceType);

        var response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<string> PrepareOrgForTest()
    {
        const string developer = "testUser";
        const string org = "ttd";
        const string orgRepo = "org-content";

        string targetOrgName = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepo = TestDataHelper.GetOrgContentRepoName(targetOrgName);
        await CopyOrgRepositoryForTest(developer, org, orgRepo, targetOrgName, targetOrgRepo);

        return GetApiBaseUrl(targetOrgName);
    }

    private static string GetApiBaseUrl(string orgName)
    {
        return $"designer/api/{orgName}/resources";
    }
}
