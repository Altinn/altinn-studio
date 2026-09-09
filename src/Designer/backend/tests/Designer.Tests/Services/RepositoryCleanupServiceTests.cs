using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Medallion.Threading;
using Medallion.Threading.FileSystem;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public sealed class RepositoryCleanupServiceTests : IDisposable
{
    private readonly string _rootDirectory = Directory.CreateTempSubdirectory().FullName;
    private readonly DateTimeOffset _now = new(2026, 8, 11, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task DeleteInactiveRepositoriesAsync_UsesLatestFileModification()
    {
        var timeProvider = new FakeTimeProvider(_now);
        SchedulingSettings settings = CreateSettings();
        string staleRepository = CreateRepository("stale-app", _now.AddDays(-31));
        string activeRepository = CreateRepository("active-app", _now.AddDays(-31));
        string recentlyModifiedFile = Path.Combine(activeRepository, "App", "config.json");
        Directory.CreateDirectory(Path.GetDirectoryName(recentlyModifiedFile)!);
        File.WriteAllText(recentlyModifiedFile, "{}");
        File.SetLastWriteTimeUtc(recentlyModifiedFile, _now.AddDays(-1).UtcDateTime);
        string nonGitDirectory = CreateNonGitDirectory("old-files", _now.AddDays(-60));
        RepositoryCleanupService service = CreateCleanupService(settings, timeProvider, CreateDirectoryCleaner());

        RepositoryCleanupResult result = await service.DeleteInactiveRepositoriesAsync();

        Assert.False(Directory.Exists(staleRepository));
        Assert.True(Directory.Exists(activeRepository));
        Assert.True(Directory.Exists(nonGitDirectory));
        Assert.Equal(new RepositoryCleanupResult(1, 1, 0, 0), result);
    }

    [Fact]
    public async Task DeleteInactiveRepositoriesAsync_DoesNotUseParentDirectoryTimestamps()
    {
        var timeProvider = new FakeTimeProvider(_now);
        SchedulingSettings settings = CreateSettings();
        string repositoryPath = CreateRepository("stale-app", _now.AddDays(-31));
        string organizationPath = Directory.GetParent(repositoryPath)!.FullName;
        string developerPath = Directory.GetParent(organizationPath)!.FullName;
        Directory.SetLastWriteTimeUtc(repositoryPath, _now.UtcDateTime);
        Directory.SetLastWriteTimeUtc(organizationPath, _now.UtcDateTime);
        Directory.SetLastWriteTimeUtc(developerPath, _now.UtcDateTime);
        RepositoryCleanupService service = CreateCleanupService(settings, timeProvider, CreateDirectoryCleaner());

        RepositoryCleanupResult result = await service.DeleteInactiveRepositoriesAsync();

        Assert.False(Directory.Exists(repositoryPath));
        Assert.Equal(new RepositoryCleanupResult(1, 1, 0, 0), result);
    }

    [Fact]
    public async Task DeleteInactiveRepositoriesAsync_RechecksFilesAfterAcquiringLock()
    {
        var timeProvider = new FakeTimeProvider(_now);
        SchedulingSettings settings = CreateSettings();
        string repositoryPath = CreateRepository("became-active", _now.AddDays(-31));
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "became-active", "test-user");
        var handle = new Mock<IDistributedSynchronizationHandle>();
        var lockService = new Mock<ILockService>();
        lockService
            .Setup(service =>
                service.AcquireRepoUserWideLockAsync(context, It.IsAny<TimeSpan?>(), It.IsAny<CancellationToken>())
            )
            .Returns(() =>
            {
                string modifiedWhileWaiting = Path.Combine(repositoryPath, "modified-while-waiting.json");
                File.WriteAllText(modifiedWhileWaiting, "{}");
                File.SetLastWriteTimeUtc(modifiedWhileWaiting, _now.UtcDateTime);
                return new ValueTask<IDistributedSynchronizationHandle>(handle.Object);
            });
        var cleaner = new Mock<IRepositoryDirectoryCleaner>();
        RepositoryCleanupService service = CreateCleanupService(
            settings,
            timeProvider,
            cleaner.Object,
            lockService.Object
        );

        RepositoryCleanupResult result = await service.DeleteInactiveRepositoriesAsync();

        Assert.True(Directory.Exists(repositoryPath));
        Assert.Equal(new RepositoryCleanupResult(1, 0, 0, 1), result);
        cleaner.Verify(instance => instance.Delete(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task DeleteInactiveRepositoriesAsync_DeletesEmptyOrganizationAndDeveloperDirectories()
    {
        var timeProvider = new FakeTimeProvider(_now);
        SchedulingSettings settings = CreateSettings();
        string repositoryPath = CreateRepository("only-app", _now.AddDays(-31));
        string organizationPath = Directory.GetParent(repositoryPath)!.FullName;
        string developerPath = Directory.GetParent(organizationPath)!.FullName;
        RepositoryCleanupService service = CreateCleanupService(settings, timeProvider, CreateDirectoryCleaner());

        RepositoryCleanupResult result = await service.DeleteInactiveRepositoriesAsync();

        Assert.False(Directory.Exists(repositoryPath));
        Assert.False(Directory.Exists(organizationPath));
        Assert.False(Directory.Exists(developerPath));
        Assert.True(Directory.Exists(_rootDirectory));
        Assert.Equal(new RepositoryCleanupResult(1, 1, 0, 0), result);
    }

    [Fact]
    public async Task DeleteInactiveRepositoriesAsync_StopsAfterConfiguredCandidateLimit()
    {
        var timeProvider = new FakeTimeProvider(_now);
        SchedulingSettings settings = CreateSettings();
        settings.RepositoryCleanup.MaxRepositoriesPerRun = 1;
        string firstRepository = CreateRepository("first-app", _now.AddDays(-60));
        string secondRepository = CreateRepository("second-app", _now.AddDays(-45));
        RepositoryCleanupService service = CreateCleanupService(settings, timeProvider, CreateDirectoryCleaner());

        RepositoryCleanupResult result = await service.DeleteInactiveRepositoriesAsync();

        Assert.NotEqual(Directory.Exists(firstRepository), Directory.Exists(secondRepository));
        Assert.Equal(new RepositoryCleanupResult(1, 1, 0, 0), result);
    }

    [Fact]
    public async Task DeleteInactiveRepositoriesAsync_RetriesTransientDeleteFailures()
    {
        SchedulingSettings settings = CreateSettings();
        settings.RepositoryCleanup.DeletionRetryDelayMilliseconds = 1;
        TimeProvider timeProvider = TimeProvider.System;
        string repositoryPath = CreateRepository("retry-app", timeProvider.GetUtcNow().AddDays(-31));
        int attempts = 0;
        var cleaner = new Mock<IRepositoryDirectoryCleaner>();
        cleaner
            .Setup(instance => instance.Delete(repositoryPath))
            .Callback(() =>
            {
                attempts++;
                if (attempts < settings.RepositoryCleanup.DeletionRetryAttempts)
                {
                    throw new IOException("Mounted volume is temporarily unavailable.");
                }

                Directory.Delete(repositoryPath, recursive: true);
            });
        RepositoryCleanupService service = CreateCleanupService(settings, timeProvider, cleaner.Object);

        RepositoryCleanupResult result = await service.DeleteInactiveRepositoriesAsync();

        Assert.Equal(settings.RepositoryCleanup.DeletionRetryAttempts, attempts);
        Assert.False(Directory.Exists(repositoryPath));
        Assert.Equal(new RepositoryCleanupResult(1, 1, 0, 0), result);
    }

    public void Dispose()
    {
        Directory.Delete(_rootDirectory, recursive: true);
    }

    private static SchedulingSettings CreateSettings()
    {
        return new SchedulingSettings
        {
            RepositoryCleanup = new RepositoryCleanupSettings
            {
                Enabled = true,
                RetentionDays = 30,
                MaxRepositoriesPerRun = 50,
                DeletionRetryAttempts = 3,
                DeletionRetryDelayMilliseconds = 1,
                LockTimeoutSeconds = 1,
            },
        };
    }

    private RepositoryCleanupService CreateCleanupService(
        SchedulingSettings settings,
        TimeProvider timeProvider,
        IRepositoryDirectoryCleaner cleaner,
        ILockService lockService = null
    )
    {
        if (lockService is null)
        {
            string lockDirectory = Path.Combine(_rootDirectory, "locks");
            Directory.CreateDirectory(lockDirectory);
            var lockProvider = new FileDistributedSynchronizationProvider(new DirectoryInfo(lockDirectory));
            lockService = new LockService(lockProvider);
        }

        var timestampScanner = new RepositoryFileTimestampScanner(NullLogger<RepositoryFileTimestampScanner>.Instance);
        var candidateSource = new RepositoryCleanupCandidateSource(
            new ServiceRepositorySettings { RepositoryLocation = _rootDirectory },
            timestampScanner,
            NullLogger<RepositoryCleanupCandidateSource>.Instance
        );
        var candidateProcessor = new RepositoryCleanupCandidateProcessor(
            settings,
            timeProvider,
            timestampScanner,
            cleaner,
            lockService,
            NullLogger<RepositoryCleanupCandidateProcessor>.Instance
        );
        return new RepositoryCleanupService(settings, timeProvider, candidateSource, candidateProcessor);
    }

    private RepositoryDirectoryCleaner CreateDirectoryCleaner() =>
        new(new ServiceRepositorySettings { RepositoryLocation = _rootDirectory });

    private string CreateRepository(string repository, DateTimeOffset lastModified)
    {
        string repositoryPath = Path.Combine(_rootDirectory, "test-user", "ttd", repository);
        string gitConfigPath = Path.Combine(repositoryPath, ".git", "config");
        string contentPath = Path.Combine(repositoryPath, "content.txt");
        Directory.CreateDirectory(Path.GetDirectoryName(gitConfigPath)!);
        File.WriteAllText(gitConfigPath, "[core]");
        File.WriteAllText(contentPath, "content");
        File.SetLastWriteTimeUtc(gitConfigPath, lastModified.UtcDateTime);
        File.SetLastWriteTimeUtc(contentPath, lastModified.UtcDateTime);
        return repositoryPath;
    }

    private string CreateNonGitDirectory(string repository, DateTimeOffset lastModified)
    {
        string directoryPath = Path.Combine(_rootDirectory, "test-user", "ttd", repository);
        Directory.CreateDirectory(directoryPath);
        string filePath = Path.Combine(directoryPath, "content.txt");
        File.WriteAllText(filePath, "content");
        File.SetLastWriteTimeUtc(filePath, lastModified.UtcDateTime);
        return directoryPath;
    }
}
