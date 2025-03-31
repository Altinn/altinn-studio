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
    public async Task GetOrgContentIds_GivenCodeListParameter_ShouldReturnOkWithCodeListIds()
    {
        string apiBaseUrl = await PrepareOrgForTest();
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
        string apiBaseUrl = await PrepareOrgForTest();
        const LibraryContentType resourceType = LibraryContentType.TextResource;
        string apiUrlWithTextResourceParameter = $"{apiBaseUrl}/{resourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithTextResourceParameter);

        var response = await HttpClient.SendAsync(request);

        List<string> textResources = await response.Content.ReadAsAsync<List<string>>();
        Assert.Equal(2, textResources.Count);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetOrgContentIds_GivenInvalidTypeParameter_ShouldReturnBadRequest()
    {
        string apiBaseUrl = await PrepareOrgForTest();
        const string invalidResourceType = "invalidResourceType";
        string apiUrlWithInvalidResourceType = $"{apiBaseUrl}/{invalidResourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithInvalidResourceType);

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
        return $"designer/api/{orgName}/content";
    }
}
