using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Exceptions.CustomTemplate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using CustomTemplateModel = Altinn.Studio.Designer.Models.CustomTemplate;

namespace Designer.Tests.Services.CustomTemplate;

public class ApplyTemplateToRepositoryTests : IDisposable
{
    private readonly string _testCacheRoot;
    private readonly string _targetRepoRoot;
    private readonly ServiceRepositorySettings _repoSettings;
    private readonly CustomTemplateSettings _templateSettings;
    private readonly Mock<IGiteaClient> _giteaClientMock;
    private readonly Mock<ILogger<CustomTemplateService>> _loggerMock;

    public ApplyTemplateToRepositoryTests()
    {
        string testRoot = Path.Combine(Path.GetTempPath(), "AltinnStudioTests", Guid.NewGuid().ToString());
        _testCacheRoot = Path.Combine(testRoot, "Cache");
        _targetRepoRoot = Path.Combine(testRoot, "Repos");

        _repoSettings = new ServiceRepositorySettings
        {
            RepositoryLocation = _testCacheRoot
        };

        _templateSettings = new CustomTemplateSettings
        {
            DefaultTemplateOrganization = "als",
            Cache = new()
            {
                LocalCacheFolder = ".template-cache",
                MetadataFileName = ".cache-info.json",
                ExpirationDays = 7,
                MaxParallelDownloads = 15
            },
            Lock = new LockSettings
            {
                MaxRetries = 30,
                RetryDelayMs = 100 // Faster for tests
            }
        };

        _giteaClientMock = new Mock<IGiteaClient>();
        _giteaClientMock
         .Setup(x => x.GetLatestCommitOnBranch("als", "als-content", null, default))
         .ReturnsAsync("abc123def456");

        _loggerMock = new Mock<ILogger<CustomTemplateService>>();
    }

    [Fact]
    public async Task ApplyTemplateToRepository_WithFilesAndRemovePaths_CopiesAndDeletes()
    {
        // Arrange
        string templateOwner = "als";
        string templateId = "test-template";
        string targetOrg = "ttd";
        string targetRepo = "test-app";
        string developer = "testUser";

        // Setup template definition
        var template = new CustomTemplateModel
        {
            Id = templateId,
            Owner = templateOwner,
            Name = "Test Template",
            Description = "A template for testing.",
            Remove = new List<string> { "App/config/oldfile.json", "OldFolder" }
        };

        // Setup target repository with existing files to be removed
        string targetRepoPath = CreateTargetRepository(targetOrg, targetRepo, developer);
        CreateFileInRepo(targetRepoPath, "App/config/oldfile.json", "old content");
        CreateFileInRepo(targetRepoPath, "OldFolder/file1.txt", "file 1");
        CreateFileInRepo(targetRepoPath, "OldFolder/file2.txt", "file 2");
        CreateFileInRepo(targetRepoPath, "KeepMe/file.txt", "keep this");

        // Setup template cache with content
        SetupTemplateCache(templateOwner, templateId, new Dictionary<string, string>
        {
            { "Controllers/HomeController.cs", "public class HomeController {}" },
            { "Views/Index.cshtml", "<h1>Hello</h1>" },
            { "Models/Data/Model.cs", "public class Model {}" }
        });

        // Mock template.json retrieval
        MockTemplateJsonFile(templateOwner, templateId, template);

        var sut = CreateService();

        // Act
        await sut.ApplyTemplateToRepository(templateOwner, templateId, targetOrg, targetRepo, developer);

        // Assert - Verify template files were copied
        Assert.True(File.Exists(Path.Combine(targetRepoPath, "Controllers/HomeController.cs")));
        Assert.True(File.Exists(Path.Combine(targetRepoPath, "Views/Index.cshtml")));
        Assert.True(File.Exists(Path.Combine(targetRepoPath, "Models/Data/Model.cs")));

        // Assert - Verify content is correct
        string controllerContent = await File.ReadAllTextAsync(Path.Combine(targetRepoPath, "Controllers/HomeController.cs"));
        Assert.Equal("public class HomeController {}", controllerContent);

        // Assert - Verify removed files/folders are gone
        Assert.False(File.Exists(Path.Combine(targetRepoPath, "App/config/oldfile.json")));
        Assert.False(Directory.Exists(Path.Combine(targetRepoPath, "OldFolder")));

        // Assert - Verify other files were not affected
        Assert.True(File.Exists(Path.Combine(targetRepoPath, "KeepMe/file.txt")));
    }

    [Fact]
    public async Task ApplyTemplateToRepository_EmptyRemoveList_OnlyCopiesFiles()
    {
        // Arrange
        string templateOwner = "als";
        string templateId = "simple-template";
        string targetOrg = "ttd";
        string targetRepo = "simple-app";
        string developer = "testUser";

        var template = new CustomTemplateModel
        {
            Id = templateId,
            Owner = templateOwner,
            Name = "Simple Template",
            Description = "A simple template without removals.",
            Remove = new List<string>() // Empty remove list
        };

        string targetRepoPath = CreateTargetRepository(targetOrg, targetRepo, developer);
        CreateFileInRepo(targetRepoPath, "existing.txt", "existing");

        SetupTemplateCache(templateOwner, templateId, new Dictionary<string, string>
        {
            { "newfile.txt", "new content" }
        });

        MockTemplateJsonFile(templateOwner, templateId, template);

        var sut = CreateService();

        // Act
        await sut.ApplyTemplateToRepository(templateOwner, templateId, targetOrg, targetRepo, developer);

        // Assert
        Assert.True(File.Exists(Path.Combine(targetRepoPath, "newfile.txt")));
        Assert.True(File.Exists(Path.Combine(targetRepoPath, "existing.txt")));
    }

    [Fact]
    public async Task ApplyTemplateToRepository_OverwritesExistingFiles()
    {
        // Arrange
        string templateOwner = "als";
        string templateId = "update-template";
        string targetOrg = "ttd";
        string targetRepo = "update-app";
        string developer = "testUser";

        var template = new CustomTemplateModel
        {
            Id = templateId,
            Owner = templateOwner,
            Name = "Update Template",
            Description = "A template that updates existing files."
        };

        string targetRepoPath = CreateTargetRepository(targetOrg, targetRepo, developer);
        CreateFileInRepo(targetRepoPath, "config.json", "old config");

        SetupTemplateCache(templateOwner, templateId, new Dictionary<string, string>
        {
            { "config.json", "new config from template" }
        });

        MockTemplateJsonFile(templateOwner, templateId, template);

        var sut = CreateService();

        // Act
        await sut.ApplyTemplateToRepository(templateOwner, templateId, targetOrg, targetRepo, developer);

        // Assert
        string content = await File.ReadAllTextAsync(Path.Combine(targetRepoPath, "config.json"));
        Assert.Equal("new config from template", content);
    }

    [Fact]
    public async Task ApplyTemplateToRepository_RemoveNonExistentPath_DoesNotThrow()
    {
        // Arrange
        string templateOwner = "als";
        string templateId = "safe-template";
        string targetOrg = "ttd";
        string targetRepo = "safe-app";
        string developer = "testUser";

        var template = new CustomTemplateModel
        {
            Id = templateId,
            Owner = templateOwner,
            Name = "Safe Template",
            Description = "A template that tries to remove non-existent paths.",
            Remove = new List<string> { "NonExistent/file.txt", "AlsoNotThere.json" }
        };

        string targetRepoPath = CreateTargetRepository(targetOrg, targetRepo, developer);

        SetupTemplateCache(templateOwner, templateId, new Dictionary<string, string>
        {
            { "file.txt", "content" }
        });

        MockTemplateJsonFile(templateOwner, templateId, template);

        var sut = CreateService();

        // Act & Assert - Should not throw
        await sut.ApplyTemplateToRepository(templateOwner, templateId, targetOrg, targetRepo, developer);

        Assert.True(File.Exists(Path.Combine(targetRepoPath, "file.txt")));
    }

    [Fact]
    public async Task ApplyTemplateToRepository_NestedDirectories_CreatesStructure()
    {
        // Arrange
        string templateOwner = "als";
        string templateId = "nested-template";
        string targetOrg = "ttd";
        string targetRepo = "nested-app";
        string developer = "testUser";

        var template = new CustomTemplateModel
        {
            Id = templateId,
            Owner = templateOwner,
            Name = "Nested Template",
            Description = "A template with nested directories."
        };

        string targetRepoPath = CreateTargetRepository(targetOrg, targetRepo, developer);

        SetupTemplateCache(templateOwner, templateId, new Dictionary<string, string>
        {
            { "Level1/Level2/Level3/deep.txt", "deep file" },
            { "Level1/sibling.txt", "sibling" },
            { "root.txt", "root" }
        });

        MockTemplateJsonFile(templateOwner, templateId, template);

        var sut = CreateService();

        // Act
        await sut.ApplyTemplateToRepository(templateOwner, templateId, targetOrg, targetRepo, developer);

        // Assert - Verify directory structure
        Assert.True(Directory.Exists(Path.Combine(targetRepoPath, "Level1/Level2/Level3")));
        Assert.True(File.Exists(Path.Combine(targetRepoPath, "Level1/Level2/Level3/deep.txt")));
        Assert.True(File.Exists(Path.Combine(targetRepoPath, "Level1/sibling.txt")));
        Assert.True(File.Exists(Path.Combine(targetRepoPath, "root.txt")));
    }

    [Fact]
    public async Task ApplyTemplateToRepository_InvalidTemplate_ThrowsException()
    {
        // Arrange
        string templateOwner = "als";
        string templateId = "invalid-template";
        string targetOrg = "ttd";
        string targetRepo = "test-app";
        string developer = "testUser";

        CreateTargetRepository(targetOrg, targetRepo, developer);

        // Mock invalid template JSON (missing required fields)
        string invalidJson = "{ \"id\": \"test\" }"; // Invalid according to schema

        _giteaClientMock
            .Setup(x => x.GetFileAndErrorAsync(templateOwner, "als-content",
                   It.Is<string>(s => s.Contains(templateId) && s.Contains("template.json")), null, default))
            .ReturnsAsync((new FileSystemObject
            {
                Content = Convert.ToBase64String(Encoding.UTF8.GetBytes(invalidJson))
            }, null));

        var sut = CreateService();

        // Act & Assert
        await Assert.ThrowsAsync<CustomTemplateException>(() =>
            sut.ApplyTemplateToRepository(templateOwner, templateId, targetOrg, targetRepo, developer));
    }

    [Fact]
    public async Task ApplyTemplateToRepository_TemplateNotFound_ThrowsException()
    {
        // Arrange
        string templateOwner = "als";
        string templateId = "missing-template";
        string targetOrg = "ttd";
        string targetRepo = "test-app";
        string developer = "testUser";

        CreateTargetRepository(targetOrg, targetRepo, developer);

        _giteaClientMock
            .Setup(x => x.GetFileAndErrorAsync(templateOwner, "als-content",
                It.Is<string>(s => s.Contains(templateId) && s.Contains("template.json")), null, default))
            .ReturnsAsync((null, new ProblemDetails { Status = 404 }));

        var sut = CreateService();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<CustomTemplateException>(() =>
            sut.ApplyTemplateToRepository(templateOwner, templateId, targetOrg, targetRepo, developer));

        Assert.Equal("NotFound", exception.Code);
    }

    [Fact]
    public async Task ApplyTemplateToRepository_UsesCache_WhenValid()
    {
        // Arrange
        string templateOwner = "als";
        string templateId = "cached-template";
        string targetOrg = "ttd";
        string targetRepo = "cached-app";
        string developer = "testUser";
        string commitSha = "abc123def456";

        var template = new CustomTemplateModel
        {
            Id = templateId,
            Owner = templateOwner,
            Name = "Cached Template",
            Description = "A template to test caching.",
            Remove = new List<string>()
        };

        string targetRepoPath = CreateTargetRepository(targetOrg, targetRepo, developer);

        // Pre-populate cache
        SetupTemplateCache(templateOwner, templateId, new Dictionary<string, string>
        {
            { "cached.txt", "from cache" }
        }, commitSha);

        MockTemplateJsonFile(templateOwner, templateId, template);

        var sut = CreateService();

        // Act
        await sut.ApplyTemplateToRepository(templateOwner, templateId, targetOrg, targetRepo, developer);

        // Assert
        Assert.True(File.Exists(Path.Combine(targetRepoPath, "cached.txt")));

        // Verify API was NOT called for content download (only for template.json and commit check)
        _giteaClientMock.Verify(x => x.GetDirectoryAsync(
            It.IsAny<string>(), It.IsAny<string>(),
            It.Is<string>(p => p.Contains("/content")),
            It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #region Helper Methods

    private string CreateTargetRepository(string org, string repo, string developer)
    {
        string path = _repoSettings.GetServicePath(org, repo, developer);
        Directory.CreateDirectory(path);
        return path;
    }

    private void CreateFileInRepo(string repoPath, string relativePath, string content)
    {
        string fullPath = Path.Combine(repoPath, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        File.WriteAllText(fullPath, content);
    }

    private void SetupTemplateCache(string owner, string templateId, Dictionary<string, string> files, string commitSha = "abc123def456")
    {
        string cachePath = Path.Combine(_testCacheRoot, ".template-cache", owner, templateId, "content");
        Directory.CreateDirectory(cachePath);

        // Create cache files
        foreach (var file in files)
        {
            string filePath = Path.Combine(cachePath, file.Key);
            Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
            File.WriteAllText(filePath, file.Value);
        }

        // Create cache metadata
        string metadataPath = Path.Combine(Path.GetDirectoryName(cachePath)!, ".cache-info.json");
        var metadata = new
        {
            CommitSha = commitSha,
            CachedAt = DateTime.UtcNow
        };
        File.WriteAllText(metadataPath, JsonSerializer.Serialize(metadata));

        // Mock commit SHA check
        _giteaClientMock
            .Setup(x => x.GetLatestCommitOnBranch(owner, $"{owner}-content", null, default))
            .ReturnsAsync(commitSha);
    }

    private void MockTemplateJsonFile(string owner, string templateId, CustomTemplateModel template)
    {
        string templateJson = JsonSerializer.Serialize(template);
        string base64Content = Convert.ToBase64String(Encoding.UTF8.GetBytes(templateJson));

        _giteaClientMock
            .Setup(x => x.GetLatestCommitOnBranch(owner, $"{owner}-content", null, default))
            .ReturnsAsync("abc123def456");

        _giteaClientMock
            .Setup(x => x.GetFileAndErrorAsync(owner, $"{owner}-content", It.Is<string>(s => s.Contains(templateId) && s.Contains("template.json")), null, default))
            .ReturnsAsync((new FileSystemObject { Content = base64Content }, null));
    }

    private CustomTemplateService CreateService()
    {
        return new CustomTemplateService(
            _giteaClientMock.Object,
            _repoSettings,
            _templateSettings,
            _loggerMock.Object);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(Path.GetDirectoryName(_testCacheRoot)!))
            {
                Directory.Delete(Path.GetDirectoryName(_testCacheRoot)!, recursive: true);
            }
        }
        catch
        {
            // Best effort cleanup
        }
    }

    #endregion
}
