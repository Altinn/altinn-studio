using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
using Task = System.Threading.Tasks.Task;

namespace Designer.Tests.Controllers.OrgLibraryController;

public class GetOrgResourcesTests : DesignerEndpointsTestsBase<GetOrgResourcesTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public GetOrgResourcesTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Developer = "testUser";
    private const string Org = "ttd";
    private const string OrgRepo = "org-content";

    [Fact]
    public async Task GetOrgResources_GivenCodeListParameter_ShouldReturnOkWithCodeLists()
    {
        string apiBaseUrl = await PrepareOrgForTest();

        const LibraryResourceType resourceType = LibraryResourceType.CodeList;
        string apiUrlWithCodeListParameter = $"{apiBaseUrl}/{resourceType}";
        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, apiUrlWithCodeListParameter);

        var response = await HttpClient.SendAsync(httpRequestMessage);
        List<string> responseContent = await response.Content.ReadAsAsync<List<string>>();

        int numberOfCodeLists = responseContent.Count;
        Assert.Equal(6, numberOfCodeLists);
    }

    [Fact]
    public async Task GetOrgResources_GivenTextResourceParameter_ShouldReturnOkWithTextResources()
    {
        string apiBaseUrl = await PrepareOrgForTest();

        const LibraryResourceType resourceType = LibraryResourceType.TextResource;
        string apiUrlWithTextResourceParameter = $"{apiBaseUrl}/{resourceType}";
        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, apiUrlWithTextResourceParameter);

        var response = await HttpClient.SendAsync(httpRequestMessage);
        List<string> responseContent = await response.Content.ReadAsAsync<List<string>>();

        int numberOfTextResources = responseContent.Count;
        Assert.Equal(2, numberOfTextResources);
    }

    [Fact]
    public async Task GetOrgResources_GivenInvalidTypeParameter_ShouldReturnBadRequest()
    {
        string apiBaseUrl = await PrepareOrgForTest();

        const string invalidResourceType = "invalidResourceType";
        string apiUrlWithInvalidResourceType = $"{apiBaseUrl}/{invalidResourceType}";
        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, apiUrlWithInvalidResourceType);

        var response = await HttpClient.SendAsync(httpRequestMessage);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<string> PrepareOrgForTest()
    {
        string targetOrgName = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepo = TestDataHelper.GetOrgContentRepoName(targetOrgName);
        await CopyOrgRepositoryForTest(Developer, Org, OrgRepo, targetOrgName, targetOrgRepo);

        return $"designer/api/{targetOrgName}/resources";
    }
}
