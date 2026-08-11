using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Services.Implementation;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class RepositoryActivityServiceTests
{
    private readonly DateTimeOffset _now = new(2026, 8, 11, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task MarkActiveAsync_PersistsAtConfiguredInterval()
    {
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "test-app", "test-user");
        var timeProvider = new FakeTimeProvider(_now);
        var repository = new Mock<IRepositoryActivityRepository>();
        RepositoryActivityService service = CreateService(repository.Object, timeProvider);

        await service.MarkActiveAsync(context);
        timeProvider.Advance(TimeSpan.FromMinutes(5));
        await service.MarkActiveAsync(context);
        timeProvider.Advance(TimeSpan.FromMinutes(11));
        await service.MarkActiveAsync(context);

        repository.Verify(
            instance => instance.MarkActiveAsync(context, _now, It.IsAny<CancellationToken>()),
            Times.Once
        );
        repository.Verify(
            instance => instance.MarkActiveAsync(context, _now.AddMinutes(16), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task MarkActiveAsync_DoesNotFailRequestWhenPersistenceFails()
    {
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "test-app", "test-user");
        var repository = new Mock<IRepositoryActivityRepository>();
        repository
            .Setup(instance =>
                instance.MarkActiveAsync(context, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>())
            )
            .ThrowsAsync(new InvalidOperationException("Database unavailable."));
        RepositoryActivityService service = CreateService(repository.Object, new FakeTimeProvider(_now));

        await service.MarkActiveAsync(context);
    }

    private static RepositoryActivityService CreateService(
        IRepositoryActivityRepository repository,
        TimeProvider timeProvider
    )
    {
        return new RepositoryActivityService(
            repository,
            new SchedulingSettings
            {
                RepositoryCleanup = new RepositoryCleanupSettings
                {
                    Enabled = true,
                    ActivityUpdateIntervalMinutes = 15,
                },
            },
            timeProvider,
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<RepositoryActivityService>.Instance
        );
    }
}
