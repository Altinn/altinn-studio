using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.OrgContentController;

public class GetOrgContentReferencesTests
    : DesignerEndpointsTestsBase<GetOrgContentReferencesTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IOrgService> _orgServiceMock;

    public GetOrgContentReferencesTests(WebApplicationFactory<Program> factory)
        : base(factory)
    {
        _orgServiceMock = new Mock<IOrgService>();
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_orgServiceMock.Object);
    }

    [Fact]
    public async Task GetOrgContentReferences_GivenNoTypeParameter_ShouldReturnOkWithAllReferences()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);

        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        using var request = new HttpRequestMessage(HttpMethod.Get, apiBaseUrl);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        List<LibraryContentReference> contentList = await response.Content.ReadAsAsync<
            List<LibraryContentReference>
        >();
        Assert.Equal(8, contentList.Count);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(contentList, item => item.Type == LibraryContentType.CodeList);
        Assert.Contains(contentList, item => item.Type == LibraryContentType.TextResource);
        Assert.All(
            contentList,
            contentItem => Assert.Equal($"org.{orgAndRepoName.Org.Name}", contentItem.Source)
        );

        _orgServiceMock.Verify(service => service.IsOrg(orgAndRepoName.Org.Name), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_GivenCodeListParameter_ShouldReturnOkWithCodeListReferences()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);

        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        const LibraryContentType ResourceType = LibraryContentType.CodeList;
        string apiUrlWithCodeListParameter = $"{apiBaseUrl}?contentType={ResourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithCodeListParameter);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        List<LibraryContentReference> contentList = await response.Content.ReadAsAsync<
            List<LibraryContentReference>
        >();
        Assert.Equal(6, contentList.Count);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.All(
            contentList,
            contentItem => Assert.Equal(LibraryContentType.CodeList, contentItem.Type)
        );
        Assert.All(
            contentList,
            contentItem => Assert.Equal($"org.{orgAndRepoName.Org.Name}", contentItem.Source)
        );

        _orgServiceMock.Verify(service => service.IsOrg(orgAndRepoName.Org.Name), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_GivenTextResourceParameter_ShouldReturnOkWithTextResourceReferences()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);

        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        const LibraryContentType ResourceType = LibraryContentType.TextResource;
        string apiUrlWithTextResourceParameter = $"{apiBaseUrl}?contentType={ResourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithTextResourceParameter);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        List<LibraryContentReference> contentList = await response.Content.ReadAsAsync<
            List<LibraryContentReference>
        >();
        Assert.Equal(2, contentList.Count);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.All(
            contentList,
            contentItem => Assert.Equal(LibraryContentType.TextResource, contentItem.Type)
        );
        Assert.All(
            contentList,
            contentItem => Assert.Equal($"org.{orgAndRepoName.Org.Name}", contentItem.Source)
        );

        _orgServiceMock.Verify(service => service.IsOrg(orgAndRepoName.Org.Name), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_GivenValidTypeParameterInMixedCaseString_ShouldReturnOkWithReferences()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);

        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        const string ResourceType = "textRESOURCE";
        string apiUrlWithTextResourceParameter = $"{apiBaseUrl}?contentType={ResourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithTextResourceParameter);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        List<LibraryContentReference> contentList = await response.Content.ReadAsAsync<
            List<LibraryContentReference>
        >();
        Assert.Equal(2, contentList.Count);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.All(
            contentList,
            contentItem => Assert.Equal(LibraryContentType.TextResource, contentItem.Type)
        );
        Assert.All(
            contentList,
            contentItem => Assert.Equal($"org.{orgAndRepoName.Org.Name}", contentItem.Source)
        );

        _orgServiceMock.Verify(service => service.IsOrg(orgAndRepoName.Org.Name), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_GivenInvalidOrg_ShouldReturnNoContentWithHeaderMessage()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(false);

        const string OrgName = "invalidOrgName";
        string apiBaseUrl = new Organisation(OrgName).ApiBaseUrl;
        using var request = new HttpRequestMessage(HttpMethod.Get, apiBaseUrl);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        string reasonHeader = Assert.Single(response.Headers.GetValues("Reason"));
        Assert.Equal($"{OrgName} is not a valid organisation", reasonHeader);

        _orgServiceMock.Verify(service => service.IsOrg(OrgName), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_WhenContentRepoDoesNotExist_ShouldReturnNoContentWithHeaderMessage()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);

        const string OrgName = "orgWithoutRepositories";
        string apiBaseUrl = new Organisation(OrgName).ApiBaseUrl;
        using var request = new HttpRequestMessage(HttpMethod.Get, apiBaseUrl);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        string reasonHeader = Assert.Single(response.Headers.GetValues("Reason"));
        Assert.Equal($"{OrgName}-content repo does not exist", reasonHeader);

        _orgServiceMock.Verify(service => service.IsOrg(OrgName), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_WhenContentRepoIsEmpty_ShouldReturnEmptyList()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);

        OrgAndRepoName orgAndRepoName = GenerateOrgAndRepoNames();
        const string Username = "testUser";
        const string SourceOrgName = "ttd";
        const string SourceRepoName = "org-content-empty";
        await CopyOrgRepositoryForTest(
            Username,
            SourceOrgName,
            SourceRepoName,
            orgAndRepoName.Org.Name,
            orgAndRepoName.RepoName
        );

        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        using var request = new HttpRequestMessage(HttpMethod.Get, apiBaseUrl);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<LibraryContentReference> contentList = await response.Content.ReadAsAsync<List<LibraryContentReference>>();
        Assert.Empty(contentList);

        _orgServiceMock.Verify(service => service.IsOrg(orgAndRepoName.Org.Name), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_GivenInvalidTypeParameter_ShouldReturnBadRequest()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);

        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        const string InvalidResourceType = "invalidResourceType";
        string apiUrlWithInvalidResourceType = $"{apiBaseUrl}?contentType={InvalidResourceType}";
        using var request = new HttpRequestMessage(HttpMethod.Get, apiUrlWithInvalidResourceType);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _orgServiceMock.Verify(service => service.IsOrg(orgAndRepoName.Org.Name), Times.Once);
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
        const string Username = "testUser";
        const string OrgName = "ttd";
        const string RepoName = "org-content";
        await CopyOrgRepositoryForTest(
            Username,
            OrgName,
            RepoName,
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
