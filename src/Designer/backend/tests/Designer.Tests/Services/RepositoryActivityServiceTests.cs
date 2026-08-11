using System;
using System.IO;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Xunit;

namespace Designer.Tests.Services;

public sealed class RepositoryActivityServiceTests : IDisposable
{
    private readonly string _rootDirectory = Directory.CreateTempSubdirectory().FullName;
    private readonly DateTimeOffset _now = new(2026, 8, 11, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public void MarkActive_UpdatesMarkerAtConfiguredInterval()
    {
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "test-app", "test-user");
        string repositoryPath = CreateRepository(context);
        var timeProvider = new FakeTimeProvider(_now);
        RepositoryActivityService service = CreateService(timeProvider);

        service.MarkActive(context, repositoryPath);
        DateTimeOffset initialActivity = service.GetLastActivity(context, repositoryPath);

        timeProvider.Advance(TimeSpan.FromMinutes(5));
        service.MarkActive(context, repositoryPath);
        Assert.Equal(initialActivity, service.GetLastActivity(context, repositoryPath));

        timeProvider.Advance(TimeSpan.FromMinutes(11));
        service.MarkActive(context, repositoryPath);
        Assert.Equal(timeProvider.GetUtcNow(), service.GetLastActivity(context, repositoryPath));
    }

    [Fact]
    public void GetLastActivity_WithoutMarker_UsesRepositoryTimestamp()
    {
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "legacy-app", "test-user");
        string repositoryPath = CreateRepository(context);
        DateTime expectedLastActivity = _now.AddDays(-45).UtcDateTime;
        Directory.SetLastWriteTimeUtc(repositoryPath, expectedLastActivity);
        RepositoryActivityService service = CreateService(new FakeTimeProvider(_now));

        DateTimeOffset actualLastActivity = service.GetLastActivity(context, repositoryPath);

        Assert.Equal(expectedLastActivity, actualLastActivity.UtcDateTime);
    }

    public void Dispose()
    {
        Directory.Delete(_rootDirectory, recursive: true);
    }

    private RepositoryActivityService CreateService(TimeProvider timeProvider)
    {
        return new RepositoryActivityService(
            new ServiceRepositorySettings { RepositoryLocation = _rootDirectory },
            new SchedulingSettings
            {
                RepositoryCleanup = new RepositoryCleanupSettings
                {
                    Enabled = true,
                    ActivityUpdateIntervalMinutes = 15,
                },
            },
            timeProvider,
            NullLogger<RepositoryActivityService>.Instance
        );
    }

    private string CreateRepository(AltinnRepoEditingContext context)
    {
        string repositoryPath = Path.Combine(_rootDirectory, context.Path);
        Directory.CreateDirectory(Path.Combine(repositoryPath, ".git"));
        return repositoryPath;
    }
}
