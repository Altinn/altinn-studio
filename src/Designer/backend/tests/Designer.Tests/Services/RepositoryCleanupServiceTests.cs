using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.RepositoryActivity;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
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
    public async Task DeleteInactiveRepositoriesAsync_DeletesOnlyInactiveGitRepositories()
    {
        var timeProvider = new FakeTimeProvider(_now);
        SchedulingSettings settings = CreateSettings();
        var activityService = new InMemoryRepositoryActivityService();
        string staleRepository = CreateRepository("stale-app", _now.AddDays(-31), activityService);
        string activeRepository = CreateRepository("active-app", _now.AddDays(-29), activityService);
        string nonGitDirectory = CreateNonGitDirectory("old-files", _now.AddDays(-60));
        RepositoryCleanupService service = CreateCleanupService(
            settings,
            timeProvider,
            activityService,
            new RepositoryDirectoryCleaner()
        );

        RepositoryCleanupResult result = await service.DeleteInactiveRepositoriesAsync();

        Assert.False(Directory.Exists(staleRepository));
        Assert.True(Directory.Exists(activeRepository));
        Assert.True(Directory.Exists(nonGitDirectory));
        Assert.Equal(new RepositoryCleanupResult(1, 1, 0, 0), result);
    }

    [Fact]
    public async Task DeleteInactiveRepositoriesAsync_UsesDirectoryTimestampForLegacyRepository()
    {
        var timeProvider = new FakeTimeProvider(_now);
        SchedulingSettings settings = CreateSettings();
        var activityService = new InMemoryRepositoryActivityService();
        string repositoryPath = CreateRepositoryDirectory("legacy-app");
        Directory.SetLastWriteTimeUtc(repositoryPath, _now.AddDays(-31).UtcDateTime);
        RepositoryCleanupService service = CreateCleanupService(
            settings,
            timeProvider,
            activityService,
            new RepositoryDirectoryCleaner()
        );

        RepositoryCleanupResult result = await service.DeleteInactiveRepositoriesAsync();

        Assert.False(Directory.Exists(repositoryPath));
        Assert.Equal(new RepositoryCleanupResult(1, 1, 0, 0), result);
    }

    [Fact]
    public async Task DeleteInactiveRepositoriesAsync_DeletesOldestRepositoriesWithinBatchLimit()
    {
        var timeProvider = new FakeTimeProvider(_now);
        SchedulingSettings settings = CreateSettings();
        settings.RepositoryCleanup.MaxRepositoriesPerRun = 1;
        var activityService = new InMemoryRepositoryActivityService();
        string oldestRepository = CreateRepository("oldest-app", _now.AddDays(-60), activityService);
        string newerRepository = CreateRepository("newer-app", _now.AddDays(-45), activityService);
        RepositoryCleanupService service = CreateCleanupService(
            settings,
            timeProvider,
            activityService,
            new RepositoryDirectoryCleaner()
        );

        RepositoryCleanupResult result = await service.DeleteInactiveRepositoriesAsync();

        Assert.False(Directory.Exists(oldestRepository));
        Assert.True(Directory.Exists(newerRepository));
        Assert.Equal(new RepositoryCleanupResult(1, 1, 0, 0), result);
    }

    [Fact]
    public async Task DeleteInactiveRepositoriesAsync_RetriesTransientDeleteFailures()
    {
        SchedulingSettings settings = CreateSettings();
        settings.RepositoryCleanup.DeletionRetryDelayMilliseconds = 1;
        TimeProvider timeProvider = TimeProvider.System;
        var activityService = new InMemoryRepositoryActivityService();
        string repositoryPath = CreateRepository("retry-app", timeProvider.GetUtcNow().AddDays(-31), activityService);
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
        RepositoryCleanupService service = CreateCleanupService(
            settings,
            timeProvider,
            activityService,
            cleaner.Object
        );

        RepositoryCleanupResult result = await service.DeleteInactiveRepositoriesAsync();

        Assert.Equal(settings.RepositoryCleanup.DeletionRetryAttempts, attempts);
        Assert.False(Directory.Exists(repositoryPath));
        Assert.Equal(new RepositoryCleanupResult(1, 1, 0, 0), result);
    }

    [Fact]
    public async Task DeleteInactiveRepositoriesAsync_RetriesPartialDeletionOnNextRun()
    {
        var timeProvider = new FakeTimeProvider(_now);
        SchedulingSettings settings = CreateSettings();
        settings.RepositoryCleanup.DeletionRetryAttempts = 1;
        var activityService = new InMemoryRepositoryActivityService();
        string repositoryPath = CreateRepository("partial-app", _now.AddDays(-31), activityService);
        var failingCleaner = new Mock<IRepositoryDirectoryCleaner>();
        failingCleaner
            .Setup(instance => instance.Delete(repositoryPath))
            .Callback(() =>
            {
                Directory.Delete(Path.Combine(repositoryPath, ".git"), recursive: true);
                throw new IOException("Mounted volume failed after partially deleting the repository.");
            });
        RepositoryCleanupService firstRun = CreateCleanupService(
            settings,
            timeProvider,
            activityService,
            failingCleaner.Object
        );

        RepositoryCleanupResult firstResult = await firstRun.DeleteInactiveRepositoriesAsync();
        RepositoryCleanupService secondRun = CreateCleanupService(
            settings,
            timeProvider,
            activityService,
            new RepositoryDirectoryCleaner()
        );
        RepositoryCleanupResult secondResult = await secondRun.DeleteInactiveRepositoriesAsync();

        Assert.Equal(new RepositoryCleanupResult(1, 0, 1, 0), firstResult);
        Assert.Equal(new RepositoryCleanupResult(1, 1, 0, 0), secondResult);
        Assert.False(Directory.Exists(repositoryPath));
    }

    [Fact]
    public async Task DeleteInactiveRepositoriesAsync_RechecksActivityAfterAcquiringLock()
    {
        var timeProvider = new FakeTimeProvider(_now);
        SchedulingSettings settings = CreateSettings();
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "became-active", "test-user");
        string repositoryPath = Path.Combine(_rootDirectory, context.Path);
        Directory.CreateDirectory(Path.Combine(repositoryPath, ".git"));
        var activityService = new Mock<IRepositoryActivityService>();
        activityService
            .Setup(service => service.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([new RepositoryActivityEntity(context, _now.AddDays(-31), false)]);
        activityService
            .Setup(service => service.GetAsync(context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RepositoryActivityEntity(context, _now, false));
        var cleaner = new Mock<IRepositoryDirectoryCleaner>();
        RepositoryCleanupService service = CreateCleanupService(
            settings,
            timeProvider,
            activityService.Object,
            cleaner.Object
        );

        RepositoryCleanupResult result = await service.DeleteInactiveRepositoriesAsync();

        Assert.True(Directory.Exists(repositoryPath));
        Assert.Equal(new RepositoryCleanupResult(1, 0, 0, 1), result);
        cleaner.Verify(instance => instance.Delete(It.IsAny<string>()), Times.Never);
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
        IRepositoryActivityService activityService,
        IRepositoryDirectoryCleaner cleaner
    )
    {
        string lockDirectory = Path.Combine(_rootDirectory, "locks");
        Directory.CreateDirectory(lockDirectory);
        var lockProvider = new FileDistributedSynchronizationProvider(new DirectoryInfo(lockDirectory));
        return new RepositoryCleanupService(
            new ServiceRepositorySettings { RepositoryLocation = _rootDirectory },
            settings,
            timeProvider,
            activityService,
            cleaner,
            new LockService(lockProvider),
            NullLogger<RepositoryCleanupService>.Instance
        );
    }

    private string CreateRepository(
        string repository,
        DateTimeOffset lastActivity,
        InMemoryRepositoryActivityService activityService
    )
    {
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", repository, "test-user");
        string repositoryPath = CreateRepositoryDirectory(repository);
        activityService.Set(new RepositoryActivityEntity(context, lastActivity, false));
        return repositoryPath;
    }

    private string CreateRepositoryDirectory(string repository)
    {
        string repositoryPath = Path.Combine(_rootDirectory, "test-user", "ttd", repository);
        Directory.CreateDirectory(Path.Combine(repositoryPath, ".git"));
        return repositoryPath;
    }

    private string CreateNonGitDirectory(string repository, DateTimeOffset lastActivity)
    {
        string directoryPath = Path.Combine(_rootDirectory, "test-user", "ttd", repository);
        Directory.CreateDirectory(directoryPath);
        Directory.SetLastWriteTimeUtc(directoryPath, lastActivity.UtcDateTime);
        return directoryPath;
    }

    private sealed class InMemoryRepositoryActivityService : IRepositoryActivityService
    {
        private readonly Dictionary<AltinnRepoEditingContext, RepositoryActivityEntity> _activities = [];

        public void Set(RepositoryActivityEntity activity) => _activities[activity.EditingContext] = activity;

        public Task MarkActiveAsync(
            AltinnRepoEditingContext editingContext,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<IReadOnlyCollection<RepositoryActivityEntity>> GetAllAsync(
            CancellationToken cancellationToken = default
        ) => Task.FromResult<IReadOnlyCollection<RepositoryActivityEntity>>(_activities.Values.ToArray());

        public Task<RepositoryActivityEntity> GetAsync(
            AltinnRepoEditingContext editingContext,
            CancellationToken cancellationToken = default
        ) => Task.FromResult(_activities.GetValueOrDefault(editingContext));

        public Task<bool> TryMarkCleanupPendingAsync(
            AltinnRepoEditingContext editingContext,
            DateTimeOffset expectedLastAccessedAt,
            CancellationToken cancellationToken = default
        )
        {
            if (
                _activities.TryGetValue(editingContext, out RepositoryActivityEntity existing)
                && existing.LastAccessedAt > expectedLastAccessedAt
            )
            {
                return Task.FromResult(false);
            }

            _activities[editingContext] = new RepositoryActivityEntity(editingContext, expectedLastAccessedAt, true);
            return Task.FromResult(true);
        }

        public Task RemoveAsync(AltinnRepoEditingContext editingContext, CancellationToken cancellationToken = default)
        {
            _activities.Remove(editingContext);
            return Task.CompletedTask;
        }
    }
}
