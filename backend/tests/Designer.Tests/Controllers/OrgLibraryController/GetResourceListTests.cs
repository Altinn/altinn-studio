using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using Altinn.Studio.Designer.Enums;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
using Task = System.Threading.Tasks.Task;

namespace Designer.Tests.Controllers.OrgLibraryController;

public class GetResourceListTests : DesignerEndpointsTestsBase<GetResourceListTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public GetResourceListTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string ApiBaseUrl = $"designer/api/{Org}/resources";

    [Fact]
    public async Task GetResourceList_GivenCodeListParameter_ShouldReturnOkWithCodeLists()
    {
        const LibraryResourceType resourceType = LibraryResourceType.CodeList;
        string apiUrlWithCodeListParameter = $"{ApiBaseUrl}/{resourceType}";
        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, apiUrlWithCodeListParameter);

        var response = await HttpClient.SendAsync(httpRequestMessage);
        List<string> responseContent = await response.Content.ReadAsAsync<List<string>>();

        List<string> expectedResponseContent = ["dummyCodeList1", "dummyCodeList2"];
        Assert.Equal(expectedResponseContent, responseContent);
    }

    [Fact]
    public async Task GetResourceList_GivenTextResourceParameter_ShouldReturnOkWithTextResources()
    {
        const LibraryResourceType resourceType = LibraryResourceType.TextResource;
        string apiUrlWithTextResourceParameter = $"{ApiBaseUrl}/{resourceType}";
        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, apiUrlWithTextResourceParameter);

        var response = await HttpClient.SendAsync(httpRequestMessage);
        List<string> responseContent = await response.Content.ReadAsAsync<List<string>>();

        List<string> expectedResponseContent = ["dummyTextResource1", "dummyTextResource2"];
        Assert.Equal(expectedResponseContent, responseContent);
    }

    [Fact]
    public async Task GetResourceList_GivenInvalidTypeParameter_ShouldReturnBadRequest()
    {
        const string invalidResourceType = "invalidResourceType";
        const string apiUrlWithInvalidResourceType = $"{ApiBaseUrl}/{invalidResourceType}";
        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, apiUrlWithInvalidResourceType);

        var response = await HttpClient.SendAsync(httpRequestMessage);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
