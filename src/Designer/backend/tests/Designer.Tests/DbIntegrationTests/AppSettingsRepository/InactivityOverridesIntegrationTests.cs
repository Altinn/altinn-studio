using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.AppSettings;
using Designer.Tests.Fixtures;
using Xunit;
using AppSettingsRepositoryImplementation = Altinn.Studio.Designer.Repository.ORMImplementation.AppSettingsRepository;

namespace Designer.Tests.DbIntegrationTests.AppSettingsRepository;

public class InactivityOverridesIntegrationTests : DbIntegrationTestsBase
{
    private readonly string _org = Guid.NewGuid().ToString("N");

    public InactivityOverridesIntegrationTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task UpsertAsync_ShouldStoreAndClearNullableOverrides()
    {
        var repository = new AppSettingsRepositoryImplementation(DbFixture.DbContext);

        await repository.UpsertAsync(Entity("app1", true, 14));
        DbFixture.DbContext.ChangeTracker.Clear();
        var stored = Assert.Single(await repository.GetAllForOrgAsync(_org));
        Assert.True(stored.UndeployOnInactivity);
        Assert.Equal(14, stored.InactivityPeriodDays);

        await repository.UpsertAsync(Entity("app1", null, null));
        DbFixture.DbContext.ChangeTracker.Clear();
        var cleared = Assert.Single(await repository.GetAllForOrgAsync(_org));
        Assert.Null(cleared.UndeployOnInactivity);
        Assert.Null(cleared.InactivityPeriodDays);
    }

    [Fact]
    public async Task GetAllForOrgAsync_ShouldOnlyReturnTheOrgsRows()
    {
        var repository = new AppSettingsRepositoryImplementation(DbFixture.DbContext);
        await repository.UpsertAsync(Entity("app1", false, null));
        await repository.UpsertAsync(Entity("app2", null, 60));
        var otherOrgEntity = Entity("app1", true, null);
        otherOrgEntity.Org = Guid.NewGuid().ToString("N");
        await repository.UpsertAsync(otherOrgEntity);
        DbFixture.DbContext.ChangeTracker.Clear();

        var result = await repository.GetAllForOrgAsync(_org);

        Assert.Equal(["app1", "app2"], result.Select(r => r.App).Order());
    }

    private AppSettingsEntity Entity(string app, bool? undeploy, int? periodDays) =>
        new()
        {
            Org = _org,
            App = app,
            UndeployOnInactivity = undeploy,
            InactivityPeriodDays = periodDays,
            Created = DateTimeOffset.UtcNow,
            CreatedBy = "developer",
            LastModifiedBy = "developer",
        };
}
