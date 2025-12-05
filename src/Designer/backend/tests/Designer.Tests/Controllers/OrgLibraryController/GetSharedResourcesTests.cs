using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
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
    private readonly Mock<IGiteaClient> _giteaClientMock = new();
    private readonly Mock<IUserOrganizationService> _userOrganizationServiceMock = new();
    private readonly Mock<ISharedContentClient> _sharedContentClientMock = new();

    private const string Org = "ttd";

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.AddSingleton(_ => _giteaClientMock.Object);
        services.AddSingleton(_ => _userOrganizationServiceMock.Object);
        services.AddSingleton(_ => _sharedContentClientMock.Object);
    }

    [Fact]
    public async Task GetSharedResources_Returns_200Ok_When_Resources_Exist()
    {
        // Arrange
        string path = "some/path";
        string repo = $"{Org}-content";
        string apiUrl = ApiUrl(path);

        string baseCommitSha = "abc123";

        string firstFileName = "file1.json";
        string firstFilePath = $"{path}/file1.json";
        string firstFileContent = "File content 1";

        string secondFileName = "file2.json";
        string secondFilePath = $"{path}/file2.json";
        string secondFileContent = "File content 2";

        _userOrganizationServiceMock
            .Setup(s => s.UserIsMemberOfOrganization(Org))
            .ReturnsAsync(true)
            .Verifiable();

        // Arrange - Mock directory content
        List<FileSystemObject> directoryContent =
        [
            new() { Name = firstFileName, Path = firstFilePath, Type = "file" },
            new() { Name = secondFileName, Path = secondFilePath, Type = "file" },
        ];

        _giteaClientMock
            .Setup(wrapper => wrapper.GetDirectoryAsync(Org, repo, path, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(directoryContent)
            .Verifiable();

        _giteaClientMock
            .Setup(wrapper => wrapper.GetLatestCommitOnBranch(Org, repo, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(baseCommitSha)
            .Verifiable();

        _giteaClientMock
            .Setup(wrapper => wrapper.GetFileAndErrorAsync(Org, repo, firstFilePath, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new FileSystemObject { Name = firstFileName, Path = firstFilePath, Type = "file", Content = firstFileContent, Encoding = "utf-8" }, null))
            .Verifiable();

        _giteaClientMock
            .Setup(wrapper => wrapper.GetFileAndErrorAsync(Org, repo, secondFilePath, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new FileSystemObject { Name = secondFileName, Path = secondFilePath, Type = "file", Content = secondFileContent, Encoding = "utf-8" }, null))
            .Verifiable();

        // Arrange - Setup expected response
        List<LibraryFile> files =
        [
            new(firstFilePath, ".json", firstFileContent, null),
            new(secondFilePath, ".json", secondFileContent, null)
        ];
        var expectedResponse = new GetSharedResourcesResponse(files, baseCommitSha);

        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(apiUrl);

        // Assert
        response.EnsureSuccessStatusCode();
        GetSharedResourcesResponse actualResponse = await response.Content.ReadFromJsonAsync<GetSharedResourcesResponse>();
        Assert.Equal(expectedResponse.CommitSha, actualResponse.CommitSha);
        Assert.Equal(expectedResponse.Files.Count, actualResponse.Files.Count);
        Assert.Collection(actualResponse.Files.OrderBy(f => f.Path),
            file =>
            {
                Assert.Equal("some/path/file1.json", file.Path);
                Assert.Equal(".json", file.ContentType);
                Assert.Equal("File content 1", file.Content);
            },
            file =>
            {
                Assert.Equal("some/path/file2.json", file.Path);
                Assert.Equal(".json", file.ContentType);
                Assert.Equal("File content 2", file.Content);
            }
        );
        _userOrganizationServiceMock.VerifyAll();
        _giteaClientMock.VerifyAll();
    }

    [Fact]
    public async Task GetSharedResources_WithMultiLevelDirectories_Traverses_Recursively_Returns_200Ok()
    {
        // Arrange
        string path = "some/path";
        string repo = $"{Org}-content";
        string apiUrl = ApiUrl(path);

        string baseCommitSha = "abc123";

        string rootFileName = "file.json";
        string rootFilePath = $"{path}/{rootFileName}";
        string rootFileContent = "File content";

        string folderName = "subfolder";
        string folderPath = $"{path}/{folderName}";

        string subFolderFileName = "subFolderFile.json";
        string subFolderFilePath = $"{folderPath}/{subFolderFileName}";
        string subFolderFileContent = "Sub file content";

        _userOrganizationServiceMock
            .Setup(s => s.UserIsMemberOfOrganization(Org))
            .ReturnsAsync(true)
            .Verifiable();

        // Arrange - Mock directory content
        List<FileSystemObject> directoryContent =
        [
            new() { Name = rootFileName, Path = rootFilePath, Type = "file" },
            new() { Name = folderName, Path = folderPath, Type = "dir" },
        ];

        List<FileSystemObject> subFolderContent =
        [
            new() { Name = subFolderFileName, Path = subFolderFilePath, Type = "file" },
        ];

        _giteaClientMock
            .Setup(wrapper => wrapper.GetDirectoryAsync(Org, repo, path, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(directoryContent)
            .Verifiable();

        _giteaClientMock
            .Setup(wrapper => wrapper.GetDirectoryAsync(Org, repo, folderPath, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(subFolderContent)
            .Verifiable();

        _giteaClientMock
            .Setup(wrapper => wrapper.GetLatestCommitOnBranch(Org, repo, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(baseCommitSha)
            .Verifiable();

        _giteaClientMock
            .Setup(wrapper => wrapper.GetFileAndErrorAsync(Org, repo, rootFilePath, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new FileSystemObject { Name = rootFileName, Path = rootFilePath, Type = "file", Content = rootFileContent, Encoding = "utf-8" }, null))
            .Verifiable();

        _giteaClientMock
            .Setup(wrapper => wrapper.GetFileAndErrorAsync(Org, repo, subFolderFilePath, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new FileSystemObject { Name = subFolderFileName, Path = subFolderFilePath, Type = "file", Content = subFolderFileContent, Encoding = "utf-8" }, null))
            .Verifiable();

        // Arrange - Setup expected response
        List<LibraryFile> files =
            [
                new(rootFilePath, ".json", rootFileContent, null),
                new(subFolderFilePath, ".json", subFolderFileContent, null)
            ];
        var expectedResponse = new GetSharedResourcesResponse(files, baseCommitSha);

        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(apiUrl);

        // Assert
        response.EnsureSuccessStatusCode();
        GetSharedResourcesResponse actualResponse = await response.Content.ReadFromJsonAsync<GetSharedResourcesResponse>();
        Assert.Equal(expectedResponse.CommitSha, actualResponse.CommitSha);
        Assert.Equal(expectedResponse.Files.Count, actualResponse.Files.Count);
        Assert.Collection(actualResponse.Files.OrderBy(f => f.Path),
            file =>
            {
                Assert.Equal("some/path/file.json", file.Path);
                Assert.Equal(".json", file.ContentType);
                Assert.Equal("File content", file.Content);
            },
            file =>
            {
                Assert.Equal("some/path/subfolder/subFolderFile.json", file.Path);
                Assert.Equal(".json", file.ContentType);
                Assert.Equal("Sub file content", file.Content);
            });
        _userOrganizationServiceMock.VerifyAll();
        _giteaClientMock.VerifyAll();
    }

    [Fact]
    public async Task GetSharedResources_Returns_403Forbidden_When_User_Not_Member_Of_Org()
    {
        // Arrange
        string path = "some/path";
        string apiUrl = ApiUrl(path);
        const bool IsMemberOfTheOrganisation = false;
        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(It.IsAny<string>())).ReturnsAsync(IsMemberOfTheOrganisation);

        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(apiUrl);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.Forbidden, response.StatusCode);
        _userOrganizationServiceMock.Verify(s => s.UserIsMemberOfOrganization("ttd"), Times.AtLeastOnce);
    }

    [Fact]
    public async Task GetSharedResources_Returns_404NotFound_WhenDirectoryNotFound()
    {
        // Arrange
        string path = "non/existing/path";
        string repo = $"{Org}-content";
        string apiUrl = ApiUrl(path);

        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(It.IsAny<string>())).ReturnsAsync(true);

        // Arrange - Mock directory content
        _giteaClientMock
            .Setup(wrapper => wrapper.GetDirectoryAsync(Org, repo, path, null, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new DirectoryNotFoundException());

        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(apiUrl);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.NotFound, response.StatusCode);

        ProblemDetails problemDetails = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(StatusCodes.Status404NotFound, problemDetails.Status);
        Assert.Equal("Directory not found", problemDetails.Title);
        _userOrganizationServiceMock.Verify(s => s.UserIsMemberOfOrganization("ttd"), Times.AtLeastOnce);
    }

    private static string ApiUrl(string path) => $"/designer/api/{Org}/shared-resources?path={path}";
}
