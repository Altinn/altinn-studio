using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.OrgLibraryController;

public class GetSharedResourcesTests(WebApplicationFactory<Program> factory) : DesignerEndpointsTestsBase<GetSharedResourcesTests>(factory), IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IGitea> _giteaClientMock = new();
    private readonly Mock<IUserOrganizationService> _userOrganizationServiceMock = new();

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.AddSingleton(_ => _giteaClientMock.Object);
        services.AddSingleton(_ => _userOrganizationServiceMock.Object);
    }

    [Fact]
    public async Task GetSharedResources_Returns_200Ok_When_Resources_Exist()
    {
        // Arrange
        string org = "ttd";
        string path = "some/path";
        string repo = $"{org}-content";
        string apiUrl = $"/designer/api/{org}/shared-resources?path={path}";

        string baseCommitSha = "abc123";

        string firstFileName = "file1.txt";
        string firstFilePath = $"{path}/file1.txt";
        string firstFileContent = "File content 1";

        string secondFileName = "file2.txt";
        string secondFilePath = $"{path}/file2.txt";
        string secondFileUrl = "http://example.com/file2.txt";

        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(org)).ReturnsAsync(true);

        // Arrange - Mock directory content
        List<FileSystemObject> directoryContent =
        [
            new FileSystemObject { Name = firstFileName, Path = firstFilePath, Type = "file" },
            new FileSystemObject { Name = secondFileName, Path = secondFilePath, Type = "file" },
        ];

        _giteaClientMock
            .Setup(wrapper => wrapper.GetDirectoryAsync(org, repo, path, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(directoryContent);

        _giteaClientMock
            .Setup(wrapper => wrapper.GetLatestCommitOnBranch(org, repo, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(baseCommitSha);

        _giteaClientMock
            .Setup(wrapper => wrapper.GetFileAsync(org, repo, firstFilePath, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FileSystemObject { Name = firstFileName, Path = firstFilePath, Type = "file", Content = firstFileContent, Encoding = "utf-8" });

        _giteaClientMock
            .Setup(wrapper => wrapper.GetFileAsync(org, repo, secondFilePath, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FileSystemObject { Name = secondFileName, Path = secondFilePath, Type = "file", HtmlUrl = secondFileUrl });

        // Arrange - Setup expected response
        List<LibraryFile> files =
        [
            new(firstFilePath, "text/plain", firstFileContent, null),
            new(secondFilePath, "text/plain", null, secondFileUrl)
        ];
        var expectedResponse = new GetSharedResourcesResponse(files, baseCommitSha);

        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(apiUrl);

        // Assert
        response.EnsureSuccessStatusCode();
        GetSharedResourcesResponse actualResponse = await response.Content.ReadFromJsonAsync<GetSharedResourcesResponse>();
        Assert.Equal(expectedResponse.CommitSha, actualResponse.CommitSha);
        Assert.Equal(expectedResponse.Files.Count, actualResponse.Files.Count);
    }

    [Fact]
    public async Task GetSharedResources_WithMultiLevelDirectories_Traverses_Recursively_Returns_200Ok()
    {
        // Arrange
        string org = "ttd";
        string path = "some/path";
        string repo = $"{org}-content";
        string apiUrl = $"/designer/api/{org}/shared-resources?path={path}";

        string baseCommitSha = "abc123";

        string rootFileName = "file.txt";
        string rootFilePath = $"{path}/{rootFileName}";
        string rootFileContent = "File content";

        string folderName = "subfolder";
        string folderPath = $"{path}/{folderName}";

        string subFolderFileName = "subFolderFile.txt";
        string subFolderFilePath = $"{path}/{subFolderFileName}";
        string subFolderFileContent = "Sub file content";

        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(org)).ReturnsAsync(true);

        // Arrange - Mock directory content
        List<FileSystemObject> directoryContent =
        [
            new FileSystemObject { Name = rootFileName, Path = rootFilePath, Type = "file" },
            new FileSystemObject { Name = folderName, Path = folderPath, Type = "dir" },
        ];

        List<FileSystemObject> subFolderContent =
        [
            new FileSystemObject { Name = subFolderFileName, Path = subFolderFilePath, Type = "file" },
        ];

        _giteaClientMock
            .Setup(wrapper => wrapper.GetDirectoryAsync(org, repo, path, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(directoryContent);

        _giteaClientMock
            .Setup(wrapper => wrapper.GetDirectoryAsync(org, repo, folderPath, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(subFolderContent);

        _giteaClientMock
            .Setup(wrapper => wrapper.GetLatestCommitOnBranch(org, repo, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(baseCommitSha);

        _giteaClientMock
            .Setup(wrapper => wrapper.GetFileAsync(org, repo, rootFilePath, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FileSystemObject { Name = rootFileName, Path = rootFilePath, Type = "file", Content = rootFileContent, Encoding = "utf-8" });

        _giteaClientMock
            .Setup(wrapper => wrapper.GetFileAsync(org, repo, subFolderFilePath, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FileSystemObject { Name = subFolderFileName, Path = subFolderFilePath, Type = "file", Content = subFolderFileContent, Encoding = "utf-8" });

        // Arrange - Setup expected response
        List<LibraryFile> files =
            [
                new(rootFilePath, "text/plain", rootFileContent, null),
                new(subFolderFilePath, "text/plain", subFolderFileContent, null)
            ];
        var expectedResponse = new GetSharedResourcesResponse(files, baseCommitSha);

        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(apiUrl);

        // Assert
        response.EnsureSuccessStatusCode();
        GetSharedResourcesResponse actualResponse = await response.Content.ReadFromJsonAsync<GetSharedResourcesResponse>();
        Assert.Equal(expectedResponse.CommitSha, actualResponse.CommitSha);
        Assert.Equal(expectedResponse.Files.Count, actualResponse.Files.Count);
    }

    [Fact]
    public async Task GetSharedResources_Returns_403Forbidden_When_User_Not_Member_Of_Org()
    {
        // Arrange
        string org = "ttd";
        string apiUrl = $"/designer/api/some-org/shared-resources?path=some/path";
        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(org)).ReturnsAsync(false);

        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(apiUrl);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetSharedResources_Returns_400BadRequest_WhenDirectoryNotFound()
    {
        // Arrange
        string org = "ttd";
        string path = "non/existing/path";
        string repo = $"{org}-content";
        string apiUrl = $"/designer/api/{org}/shared-resources?path={path}";

        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(org)).ReturnsAsync(true);

        // Arrange - Mock directory content
        _giteaClientMock
            .Setup(wrapper => wrapper.GetDirectoryAsync(org, repo, path, null, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new DirectoryNotFoundException());

        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(apiUrl);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.NotFound, response.StatusCode);

        ProblemDetails problemDetails = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(StatusCodes.Status404NotFound, problemDetails.Status);
        Assert.Equal("Directory not found", problemDetails.Title);
    }
}
