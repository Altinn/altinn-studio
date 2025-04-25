using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.OrgResourceController;

public class GetOrgResourceIdsTests : DesignerEndpointsTestsBase<GetOrgResourceIdsTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IOrgService> _orgServiceMock;

    public GetOrgResourceIdsTests(WebApplicationFactory<Program> factory) : base(factory)
    {
        _orgServiceMock = new Mock<IOrgService>();
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_orgServiceMock.Object);
    }

    [Fact]
    public async Task GetOrgResourceIds_GivenCodeListParameter_ShouldReturnOkWithCodeListIds()
    {
        // Arrange
        _orgServiceMock.Setup(s => s.IsOrg(It.IsAny<string>())).ReturnsAsync(true);

        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        const LibraryResourceType resourceType = LibraryResourceType.CodeList;
        string apiUrlWithCodeListParameter = $"{apiBaseUrl}/{resourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithCodeListParameter);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        _orgServiceMock.Verify(s => s.IsOrg(It.IsAny<string>()), Times.Once);
        List<string> codeLists = await response.Content.ReadAsAsync<List<string>>();
        Assert.Equal(6, codeLists.Count);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    }

    [Fact]
    public async Task GetOrgResourceIds_GivenTextResourceParameter_ShouldReturnOkWithTextResourceIds()
    {
        // Arrange
        _orgServiceMock.Setup(s => s.IsOrg(It.IsAny<string>())).ReturnsAsync(true);

        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        const LibraryResourceType resourceType = LibraryResourceType.TextResource;
        string apiUrlWithTextResourceParameter = $"{apiBaseUrl}/{resourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithTextResourceParameter);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        _orgServiceMock.Verify(s => s.IsOrg(orgAndRepoName.Org.Name), Times.Once);
        List<string> textResources = await response.Content.ReadAsAsync<List<string>>();
        Assert.Equal(2, textResources.Count);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    }

    [Fact]
    public async Task GetOrgResourceIds_GivenValidTypeParameterInMixedCaseString_ShouldReturnOkWithResource()
    {
        // Arrange
        _orgServiceMock.Setup(s => s.IsOrg(It.IsAny<string>())).ReturnsAsync(true);

        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        const string resourceType = "textRESOURCE";
        string apiUrlWithTextResourceParameter = $"{apiBaseUrl}/{resourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithTextResourceParameter);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        _orgServiceMock.Verify(s => s.IsOrg(orgAndRepoName.Org.Name), Times.Once);
        List<string> textResources = await response.Content.ReadAsAsync<List<string>>();
        Assert.Equal(2, textResources.Count);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetOrgResourceIds_GivenInvalidOrg_ShouldReturnNoContentWithHeaderMessage()
    {
        // Arrange
        _orgServiceMock.Setup(s => s.IsOrg(It.IsAny<string>())).ReturnsAsync(false);

        const string orgName = "invalidOrgName";
        string apiBaseUrl = new Organisation(orgName).ApiBaseUrl;
        const LibraryResourceType resourceType = LibraryResourceType.CodeList;
        string apiUrlWithTextInvalidOrg = $"{apiBaseUrl}/{resourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithTextInvalidOrg);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        _orgServiceMock.Verify(s => s.IsOrg(orgName), Times.Once);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.NotNull(response.Headers.GetValues("Reason"));
    }

    [Fact]
    public async Task GetOrgResourceIds_GivenInvalidTypeParameter_ShouldReturnBadRequest()
    {
        // Arrange
        _orgServiceMock.Setup(s => s.IsOrg(It.IsAny<string>())).ReturnsAsync(true);

        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        const string invalidResourceType = "invalidResourceType";
        string apiUrlWithInvalidResourceType = $"{apiBaseUrl}/{invalidResourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithInvalidResourceType);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        _orgServiceMock.Verify(s => s.IsOrg(orgAndRepoName.Org.Name), Times.Once);
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
