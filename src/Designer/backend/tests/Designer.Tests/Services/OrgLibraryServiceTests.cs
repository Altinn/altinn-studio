#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation.Organisation;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class OrgLibraryServiceTests
{

    private const string Org = "ttd";
    private const string NotACodeList = "[{\"This is not a code list\"}]";
    private const string CodeList = "[{\"value\":\"US\", \"label\":{\"nb\":\"Amerika\"}}]";

    [Theory]
    [InlineData("EmptyDir", 0)]
    [InlineData("CodeLists", 1)]
    [InlineData(null, 2)]
    public async Task GetSharedResourcesByPath(string? path, int expectedFileCount)
    {
        // Arrange
        string notACodeListContent = Convert.ToBase64String(Encoding.UTF8.GetBytes(NotACodeList));
        string codeListContent = Convert.ToBase64String(Encoding.UTF8.GetBytes(CodeList));
        List<FileSystemObject> rootObjects = [
            new FileSystemObject(){
                Encoding = "base64",
                Content = notACodeListContent,
                Name = "rootFile.json",
                Type = "file",
                Path = "/rootFile.json"
            },
            new FileSystemObject(){
                Name = "CodeLists",
                Type = "dir",
                Path = "CodeLists"
            }
        ];

        List<FileSystemObject> codeListFiles = [
            new FileSystemObject(){
                Encoding = "base64",
                Content = codeListContent,
                Name = "fileInPath.json",
                Type = "file",
                Path = "CodeLists/fileInPath.json"
            }
        ];

        List<FileSystemObject> emptyDirFiles = [];
        string commitSha = "123abc";

        Mock<IGiteaClient> giteaClient = new();

        // Setup for root directory (path == null)
        giteaClient.Setup(g => g.GetDirectoryAsync(Org, "ttd-content", null, It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(rootObjects);

        // Setup for CodeLists directory
        giteaClient.Setup(g => g.GetDirectoryAsync(Org, "ttd-content", "CodeLists", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(codeListFiles);

        // Setup for EmptyDir directory
        giteaClient.Setup(g => g.GetDirectoryAsync(Org, "ttd-content", "EmptyDir", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(emptyDirFiles);

        giteaClient.Setup(g => g.GetFileAndErrorAsync(Org, "ttd-content", "/rootFile.json", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((rootObjects[0], null));

        giteaClient.Setup(g => g.GetFileAndErrorAsync(Org, "ttd-content", "CodeLists/fileInPath.json", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((codeListFiles[0], null));

        giteaClient.Setup(g => g.GetLatestCommitOnBranch(Org, "ttd-content", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(commitSha);

        OrgLibraryService orgLibraryService = Setup(overrideGitea: giteaClient);

        // Act
        GetSharedResourcesResponse response = await orgLibraryService.GetSharedResourcesByPath(Org, path);

        // Assert
        Assert.Equal(commitSha, response.CommitSha);
        Assert.Equal(expectedFileCount, response.Files.Count);
    }

    [Fact]
    public async Task GetSharedResourcesByPath_ReturnsEmptyListWhenDirectoryNotFoundExceptionIsThrown()
    {
        // Arrange
        const string Path = "Non-existent path";
        const string CommitSha = "123abc";

        Mock<IGiteaClient> giteaClient = new();

        giteaClient
            .Setup(g => g.GetDirectoryAsync(Org, "ttd-content", Path, null, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new DirectoryNotFoundException())
            .Verifiable();

        giteaClient.Setup(g => g.GetLatestCommitOnBranch(Org, "ttd-content", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CommitSha)
            .Verifiable();

        OrgLibraryService orgLibraryService = Setup(overrideGitea: giteaClient);

        // Act and Assert
        GetSharedResourcesResponse response = await orgLibraryService.GetSharedResourcesByPath(Org, Path);

        // Assert
        Assert.Equal(CommitSha, response.CommitSha);
        Assert.Empty(response.Files);
        giteaClient.VerifyAll();
    }

    [Fact]
    public async Task UpdateFile_WithNullContent_DeletesFile()
    {
        // Arrange
        string org = "ttd";
        string developer = "testUser";
        string filePath = "texts/old.json";

        FileMetadata fileMetadata = new(filePath, null);

        // Create a temporary directory for the test repository
        string tempDir = Path.Join(Path.GetTempPath(), Guid.NewGuid().ToString());
        string repoPath = Path.Join(tempDir, developer, org, "ttd-content");
        string fullFilePath = Path.Join(repoPath, filePath);

        Directory.CreateDirectory(Path.GetDirectoryName(fullFilePath)!);
        await File.WriteAllTextAsync(fullFilePath, "old content");

        try
        {
            Mock<IAltinnGitRepositoryFactory> mockFactory = new();
            mockFactory
                .Setup(f => f.GetAltinnGitRepository(org, "ttd-content", developer))
                .Returns(new AltinnGitRepository(org, "ttd-content", developer, tempDir, repoPath));

            OrgLibraryService service = Setup(overrideFactory: mockFactory);

            // Act
            await service.UpdateFile(org, developer, fileMetadata);

            // Assert
            Assert.False(File.Exists(fullFilePath));
        }
        finally
        {
            // Make sure we clean up the temp folder even if the test fails
            if (Directory.Exists(tempDir))
            {
                Directory.Delete(tempDir, true);
            }
        }
    }

    private static OrgLibraryService Setup(
        Mock<IGiteaClient>? overrideGitea = null,
        Mock<IAltinnGitRepositoryFactory>? overrideFactory = null
        )
    {
        Mock<IGiteaClient> giteaClient = overrideGitea ?? new();
        Mock<ISourceControl> sourceControl = new();
        Mock<IAltinnGitRepositoryFactory> altinnGitRepositoryFactory = overrideFactory ?? new();
        Mock<ISharedContentClient> sharedContentClient = new();

        return new(giteaClient.Object, sourceControl.Object, altinnGitRepositoryFactory.Object, sharedContentClient.Object);
    }
}
