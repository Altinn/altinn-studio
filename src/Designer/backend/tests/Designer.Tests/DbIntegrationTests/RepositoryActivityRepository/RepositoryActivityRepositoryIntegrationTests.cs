using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.RepositoryActivity;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.RepositoryActivityRepository;

public class RepositoryActivityRepositoryIntegrationTests : DbIntegrationTestsBase
{
    public RepositoryActivityRepositoryIntegrationTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task ActivityLifecycle_IsAtomicAndDoesNotRegressTimestamp()
    {
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            "ttd",
            $"repository-activity-{Guid.NewGuid():N}",
            "test-user"
        );
        DateTimeOffset initialActivity = new(2026, 8, 1, 8, 0, 0, TimeSpan.Zero);
        DateTimeOffset newerActivity = initialActivity.AddHours(1);
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.RepositoryActivityRepository(
            DbFixture.DbContext
        );

        await repository.MarkActiveAsync(context, initialActivity);
        await repository.MarkActiveAsync(context, initialActivity.AddMinutes(-1));
        bool initiallyMarkedForCleanup = await repository.TryMarkCleanupPendingAsync(context, initialActivity);
        await repository.MarkActiveAsync(context, newerActivity);
        bool staleCleanupAttemptAccepted = await repository.TryMarkCleanupPendingAsync(context, initialActivity);
        RepositoryActivityEntity activity = await repository.GetAsync(context);

        Assert.True(initiallyMarkedForCleanup);
        Assert.False(staleCleanupAttemptAccepted);
        Assert.Equal(newerActivity, activity.LastAccessedAt);
        Assert.False(activity.CleanupPending);

        await repository.RemoveAsync(context);
        Assert.Null(await repository.GetAsync(context));
    }
}
