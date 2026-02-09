using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using CustomTemplateModel = Altinn.Studio.Designer.Models.CustomTemplate;

namespace Designer.Tests.Services.CustomTemplate;

public class GetCustomTemplateListTests : IDisposable
{
    private readonly string _testCacheRoot;
    private readonly ServiceRepositorySettings _repoSettings;
    private readonly CustomTemplateSettings _templateSettings;
    private readonly Mock<IGiteaClient> _giteaClientMock;
    private readonly Mock<ILogger<CustomTemplateService>> _loggerMock;

    public GetCustomTemplateListTests()
    {
        string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(GetCustomTemplateListTests).Assembly.Location).LocalPath);
        _testCacheRoot = Path.Combine(unitTestFolder, "_TestData", "TemplateCache", Guid.NewGuid().ToString());

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
                RetryDelayMs = 1000
            }
        };

        _giteaClientMock = new Mock<IGiteaClient>();
        _loggerMock = new Mock<ILogger<CustomTemplateService>>();
    }

    [Fact]
    public async Task GetCustomTemplateList_CacheMiss_DownloadsAndCachesManifest()
    {
        // Arrange
        string commitSha = "abc123def456";
        var expectedTemplates = new List<CustomTemplateModel>
        {
            new() { Id = "template-1", Owner = "als", Name = "Template 1", Description = "Description for Template 1" },
            new() { Id = "template-2", Owner = "als", Name = "Template 2", Description = "Description for Template 2" }
        };

        string manifestJson = JsonSerializer.Serialize(expectedTemplates);
        string base64Content = Convert.ToBase64String(Encoding.UTF8.GetBytes(manifestJson));

        _giteaClientMock
            .Setup(x => x.GetLatestCommitOnBranch("als", "als-content", null, default))
            .ReturnsAsync(commitSha);

        _giteaClientMock
            .Setup(x => x.GetFileAndErrorAsync("als", "als-content", "Templates/templatemanifest.json", null, default))
            .ReturnsAsync((new FileSystemObject { Content = base64Content }, null));

        var sut = CreateService();

        // Act
        List<CustomTemplateDto> result = await sut.GetCustomTemplateList();

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal("template-1", result[0].Id);
        Assert.Equal("template-2", result[1].Id);

        // Verify cache files exist
        string cachePath = Path.Combine(_testCacheRoot, ".template-cache", "als");
        string manifestCachePath = Path.Combine(cachePath, "templatemanifest.json");
        string metadataPath = Path.Combine(cachePath, ".cache-info.json");

        Assert.True(File.Exists(manifestCachePath), "Template manifest should be cached");
        Assert.True(File.Exists(metadataPath), "Cache metadata should exist");

        // Verify cache content
        string cachedManifest = await File.ReadAllTextAsync(manifestCachePath);
        var cachedTemplates = JsonSerializer.Deserialize<List<CustomTemplateModel>>(cachedManifest);
        Assert.Equal(2, cachedTemplates.Count);

        // Verify metadata
        string metadataJson = await File.ReadAllTextAsync(metadataPath);
        var metadata = JsonSerializer.Deserialize<Dictionary<string, object>>(metadataJson);
        Assert.NotNull(metadata);

        _giteaClientMock.Verify(x => x.GetFileAndErrorAsync(
            "als", "als-content", "Templates/templatemanifest.json", null, default), Times.Once);
    }

    [Fact]
    public async Task GetCustomTemplateList_CacheHit_UsesCache()
    {
        // Arrange
        string commitSha = "abc123def456";
        var cachedTemplates = new List<CustomTemplateModel>
        {
            new() { Id = "cached-template", Owner = "als", Name = "Cached Template", Description = "Description for Cached Template" }
        };

        // Setup cache manually
        string cachePath = Path.Combine(_testCacheRoot, ".template-cache", "als");
        Directory.CreateDirectory(cachePath);

        string manifestPath = Path.Combine(cachePath, "templatemanifest.json");
        await File.WriteAllTextAsync(manifestPath, JsonSerializer.Serialize(cachedTemplates));

        string metadataPath = Path.Combine(cachePath, ".cache-info.json");
        var metadata = new
        {
            CommitSha = commitSha,
            CachedAt = DateTime.UtcNow
        };
        await File.WriteAllTextAsync(metadataPath, JsonSerializer.Serialize(metadata));

        _giteaClientMock
            .Setup(x => x.GetLatestCommitOnBranch("als", "als-content", null, default))
            .ReturnsAsync(commitSha);

        var sut = CreateService();

        // Act
        List<CustomTemplateDto> result = await sut.GetCustomTemplateList();

        // Assert
        Assert.Single(result);
        Assert.Equal("cached-template", result[0].Id);

        // Verify API was NOT called to download manifest
        _giteaClientMock.Verify(x => x.GetFileAndErrorAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task GetCustomTemplateList_CacheExpired_RedownloadsManifest()
    {
        // Arrange
        string commitSha = "abc123def456";

        // Setup expired cache
        string cachePath = Path.Combine(_testCacheRoot, ".template-cache", "als");
        Directory.CreateDirectory(cachePath);

        string manifestPath = Path.Combine(cachePath, "templatemanifest.json");
        await File.WriteAllTextAsync(manifestPath, "[]");

        string metadataPath = Path.Combine(cachePath, ".cache-info.json");
        var oldMetadata = new
        {
            CommitSha = commitSha,
            CachedAt = DateTime.UtcNow.AddDays(-8) // Expired (7 days is default)
        };
        await File.WriteAllTextAsync(metadataPath, JsonSerializer.Serialize(oldMetadata));

        var newTemplates = new List<CustomTemplateModel>
        {
            new() { Id = "new-template", Owner = "als", Name = "New Template", Description = "Description for New Template" }
        };
        string newManifestJson = JsonSerializer.Serialize(newTemplates);

        _giteaClientMock
            .Setup(x => x.GetLatestCommitOnBranch("als", "als-content", null, default))
            .ReturnsAsync(commitSha);

        _giteaClientMock
            .Setup(x => x.GetFileAndErrorAsync("als", "als-content", "Templates/templatemanifest.json", null, default))
            .ReturnsAsync((new FileSystemObject
            {
                Content = Convert.ToBase64String(Encoding.UTF8.GetBytes(newManifestJson))
            }, null));

        var sut = CreateService();

        // Act
        List<CustomTemplateDto> result = await sut.GetCustomTemplateList();

        // Assert
        Assert.Single(result);
        Assert.Equal("new-template", result[0].Id);

        // Verify metadata was updated with same commit SHA
        string updatedMetadataJson = await File.ReadAllTextAsync(metadataPath);
        Assert.Contains(commitSha, updatedMetadataJson);

        _giteaClientMock.Verify(x => x.GetFileAndErrorAsync(
            "als", "als-content", "Templates/templatemanifest.json", null, default), Times.Once);
    }

    [Fact]
    public async Task GetCustomTemplateList_DifferentCommitSha_RedownloadsManifest()
    {
        // Arrange
        string oldCommitSha = "abc123def456";
        string newCommitSha = "123abc456def";

        // Setup cache with old commit SHA
        string cachePath = Path.Combine(_testCacheRoot, ".template-cache", "als");
        Directory.CreateDirectory(cachePath);

        string manifestPath = Path.Combine(cachePath, "templatemanifest.json");
        await File.WriteAllTextAsync(manifestPath, "[]");

        string metadataPath = Path.Combine(cachePath, ".cache-info.json");
        var oldMetadata = new
        {
            CommitSha = oldCommitSha,
            CachedAt = DateTime.UtcNow.AddMinutes(-5) // Recent, but commit SHA changed
        };
        await File.WriteAllTextAsync(metadataPath, JsonSerializer.Serialize(oldMetadata));

        var updatedTemplates = new List<CustomTemplateModel>
        {
            new() { Id = "updated-template", Owner = "als", Name = "Updated Template" , Description =  "Description for Updated Template" }
        };

        _giteaClientMock
            .Setup(x => x.GetLatestCommitOnBranch("als", "als-content", null, default))
            .ReturnsAsync(newCommitSha);

        _giteaClientMock
            .Setup(x => x.GetFileAndErrorAsync("als", "als-content", "Templates/templatemanifest.json", null, default))
            .ReturnsAsync((new FileSystemObject
            {
                Content = Convert.ToBase64String(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(updatedTemplates)))
            }, null));

        var sut = CreateService();

        // Act
        List<CustomTemplateDto> result = await sut.GetCustomTemplateList();

        // Assert
        Assert.Single(result);
        Assert.Equal("updated-template", result[0].Id);

        // Verify metadata was updated
        string updatedMetadataJson = await File.ReadAllTextAsync(metadataPath);
        Assert.Contains(newCommitSha, updatedMetadataJson);
    }

    [Fact]
    public async Task GetCustomTemplateList_NoCacheDirectory_CreatesAndDownloads()
    {
        // Arrange
        string commitSha = "abc123def456";
        var templates = new List<CustomTemplateModel>
        {
            new() { Id = "test-template", Owner = "als", Name = "Test", Description = "Description for Test Template" }
        };

        _giteaClientMock
            .Setup(x => x.GetLatestCommitOnBranch("als", "als-content", null, default))
            .ReturnsAsync(commitSha);

        _giteaClientMock
            .Setup(x => x.GetFileAndErrorAsync("als", "als-content", "Templates/templatemanifest.json", null, default))
            .ReturnsAsync((new FileSystemObject
            {
                Content = Convert.ToBase64String(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(templates)))
            }, null));

        var sut = CreateService();

        // Act
        List<CustomTemplateDto> result = await sut.GetCustomTemplateList();

        // Assert
        string cachePath = Path.Combine(_testCacheRoot, ".template-cache", "als");
        Assert.True(Directory.Exists(cachePath), "Cache directory should be created");
        Assert.Single(result);
    }

    [Fact]
    public async Task GetCustomTemplateList_EmptyManifest_ReturnsEmptyList()
    {
        // Arrange
        _giteaClientMock
            .Setup(x => x.GetLatestCommitOnBranch("als", "als-content", null, default))
            .ReturnsAsync("abc123def456");

        _giteaClientMock
            .Setup(x => x.GetFileAndErrorAsync("als", "als-content", "Templates/templatemanifest.json", null, default))
            .ReturnsAsync((new FileSystemObject
            {
                Content = Convert.ToBase64String(Encoding.UTF8.GetBytes("[]"))
            }, null));

        var sut = CreateService();

        // Act
        List<CustomTemplateDto> result = await sut.GetCustomTemplateList();

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetCustomTemplateList_ManifestNotFound_SilentlyReturnsEmptyList()
    {
        // Arrange
        _giteaClientMock
            .Setup(x => x.GetLatestCommitOnBranch("als", "als-content", null, default))
            .ReturnsAsync("abc123def456");

        _giteaClientMock
            .Setup(x => x.GetFileAndErrorAsync("als", "als-content", "Templates/templatemanifest.json", null, default))
            .ReturnsAsync((null, new ProblemDetails { Status = 404 }));

        var sut = CreateService();

        // Act & Assert
        List<CustomTemplateDto> result = await sut.GetCustomTemplateList();
        Assert.Empty(result);
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
        if (Directory.Exists(_testCacheRoot))
        {
            try
            {
                Directory.Delete(_testCacheRoot, recursive: true);
            }
            catch
            {
                // Best effort cleanup
            }
        }
    }
}
