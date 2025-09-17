using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.OrgContentController;

public class GetOrgContentReferencesTests : DesignerEndpointsTestsBase<GetOrgContentReferencesTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IOrgService> _orgServiceMock;
    private readonly Mock<IGiteaContentLibraryService> _giteaContentLibraryServiceMock;
    private const string Username = "testUser";
    private const string SourceOrgName = "ttd";
    private const string SourceRepoName = "org-content";
    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public GetOrgContentReferencesTests(WebApplicationFactory<Program> factory) : base(factory)
    {
        _orgServiceMock = new Mock<IOrgService>();
        _giteaContentLibraryServiceMock = new Mock<IGiteaContentLibraryService>();
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_orgServiceMock.Object);
        services.AddSingleton(_giteaContentLibraryServiceMock.Object);
    }

    [Fact]
    public async Task GetOrgContentReferences_GivenNoTypeParameter_ShouldReturnOkWithAllReferences()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);
        MockGiteaResponses();

        OrgAndRepoName orgAndRepoName = await CreateOrgWithRepository();
        string apiBaseUrl = orgAndRepoName.Org.ApiBaseUrl;
        using var request = new HttpRequestMessage(HttpMethod.Get, apiBaseUrl);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        List<LibraryContentReference> contentList = await response.Content.ReadAsAsync<
            List<LibraryContentReference>
        >();
        Assert.Equal(10, contentList.Count);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(contentList, item => item.Type == LibraryContentType.CodeList);
        Assert.Contains(contentList, item => item.Type == LibraryContentType.TextResource);
        Assert.All(
            contentList,
            contentItem => Assert.Equal($"org.{orgAndRepoName.Org.Name}", contentItem.Source)
        );

        _orgServiceMock.Verify(service => service.IsOrg(orgAndRepoName.Org.Name), Times.Once);
        _giteaContentLibraryServiceMock.Verify(service => service.GetCodeListIds(orgAndRepoName.Org.Name), Times.Once);
        _giteaContentLibraryServiceMock.Verify(service => service.GetTextIds(orgAndRepoName.Org.Name), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_GivenCodeListParameter_ShouldReturnOkWithCodeListReferences()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);
        MockGiteaResponses();

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
        Assert.Equal(7, contentList.Count);
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
        _giteaContentLibraryServiceMock.Verify(service => service.GetCodeListIds(orgAndRepoName.Org.Name), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_GivenTextResourceParameter_ShouldReturnOkWithTextResourceReferences()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);
        MockGiteaResponses();

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
        Assert.Equal(3, contentList.Count);
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
        _giteaContentLibraryServiceMock.Verify(service => service.GetTextIds(orgAndRepoName.Org.Name), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_GivenValidTypeParameterInMixedCaseString_ShouldReturnOkWithReferences()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);
        MockGiteaResponses();

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
        Assert.Equal(3, contentList.Count);
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
        _giteaContentLibraryServiceMock.Verify(service => service.GetTextIds(orgAndRepoName.Org.Name), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_GivenInvalidOrg_ShouldReturnNoContentWithHeaderMessage()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(false);

        const string TargetOrgName = "invalidOrgName";
        string apiBaseUrl = new Organisation(TargetOrgName).ApiBaseUrl;
        using var request = new HttpRequestMessage(HttpMethod.Get, apiBaseUrl);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        string reasonHeader = Assert.Single(response.Headers.GetValues("Reason"));
        Assert.Equal($"{TargetOrgName} is not a valid organisation", reasonHeader);

        _orgServiceMock.Verify(service => service.IsOrg(TargetOrgName), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_WhenContentRepoDoesNotExist_ShouldReturnNoContentWithHeaderMessage()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);

        const string TargetOrgName = "orgWithoutRepositories";
        string apiBaseUrl = new Organisation(TargetOrgName).ApiBaseUrl;
        using var request = new HttpRequestMessage(HttpMethod.Get, apiBaseUrl);

        // Act
        var response = await HttpClient.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        string reasonHeader = Assert.Single(response.Headers.GetValues("Reason"));
        Assert.Equal($"{TargetOrgName}-content repo does not exist", reasonHeader);

        _orgServiceMock.Verify(service => service.IsOrg(TargetOrgName), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_WhenContentRepoIsEmpty_ShouldReturnEmptyList()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);
        _giteaContentLibraryServiceMock.Setup(service => service.GetCodeListIds(It.IsAny<string>())).ReturnsAsync([]);
        _giteaContentLibraryServiceMock.Setup(service => service.GetTextIds(It.IsAny<string>())).ReturnsAsync([]);
        _giteaContentLibraryServiceMock.Setup(service => service.OrgContentRepoExists(It.IsAny<string>())).ReturnsAsync(true);

        OrgAndRepoName orgAndRepoName = GenerateOrgAndRepoNames();
        const string SourceRepoNameEmpty = "org-content-empty";
        await CopyOrgRepositoryForTest(
            Username,
            SourceOrgName,
            SourceRepoNameEmpty,
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
        _giteaContentLibraryServiceMock.Verify(service => service.GetCodeListIds(orgAndRepoName.Org.Name), Times.Once);
        _giteaContentLibraryServiceMock.Verify(service => service.GetTextIds(orgAndRepoName.Org.Name), Times.Once);
        _giteaContentLibraryServiceMock.Verify(service => service.OrgContentRepoExists(orgAndRepoName.Org.Name), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_GivenInvalidTypeParameter_ShouldReturnBadRequest()
    {
        // Arrange
        _orgServiceMock.Setup(service => service.IsOrg(It.IsAny<string>())).ReturnsAsync(true);
        _giteaContentLibraryServiceMock.Setup(service => service.OrgContentRepoExists(It.IsAny<string>())).ReturnsAsync(true);

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
        _giteaContentLibraryServiceMock.Verify(service => service.OrgContentRepoExists(orgAndRepoName.Org.Name), Times.Once);
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
        await CopyOrgRepositoryForTest(
            Username,
            SourceOrgName,
            SourceRepoName,
            orgAndRepoName.Org.Name,
            orgAndRepoName.RepoName
        );
    }

    private void MockGiteaResponses()
    {
        string[] codeListFileNames = TestDataHelper.GetRepositoryFileNames(Username, SourceOrgName, SourceRepoName, "CodeLists/");
        string[] textResourceFileNames = TestDataHelper.GetRepositoryFileNames(Username, SourceOrgName, SourceRepoName, "Texts/");

        List<string> codeListIds = codeListFileNames.Select(Path.GetFileNameWithoutExtension).ToList();
        List<string> textResourceElementIds = [];

        foreach (string fileName in textResourceFileNames)
        {
            string file = TestDataHelper.GetFileFromRepo(SourceOrgName, SourceRepoName, Username, fileName);
            TextResource textResource = JsonSerializer.Deserialize<TextResource>(file, s_jsonOptions);
            textResourceElementIds.AddRange(textResource.Resources.Select(elem => elem.Id));
        }
        List<string> textIds = textResourceElementIds.Distinct().ToList();

        _giteaContentLibraryServiceMock
            .Setup(service => service.GetCodeListIds(It.IsAny<string>()))
            .ReturnsAsync(codeListIds);
        _giteaContentLibraryServiceMock
            .Setup(service => service.GetTextIds(It.IsAny<string>()))
            .ReturnsAsync(textIds);
        _giteaContentLibraryServiceMock
            .Setup(service => service.OrgContentRepoExists(It.IsAny<string>()))
            .ReturnsAsync(true);
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
