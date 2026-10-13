using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.OrgSettings;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;
using OrgSettingsRepositoryImplementation = Altinn.Studio.Designer.Repository.ORMImplementation.OrgSettingsRepository;

namespace Designer.Tests.DbIntegrationTests.OrgSettingsRepository;

public class OrgSettingsRepositoryIntegrationTests : DbIntegrationTestsBase
{
    private readonly string _org = Guid.NewGuid().ToString("N");

    public OrgSettingsRepositoryIntegrationTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task GetAsync_WithoutRow_ShouldReturnNull()
    {
        var repository = new OrgSettingsRepositoryImplementation(DbFixture.DbContext);

        Assert.Null(await repository.GetAsync(_org));
    }

    [Fact]
    public async Task UpsertAsync_ShouldInsertThenUpdateKeepingCreationFields()
    {
        var repository = new OrgSettingsRepositoryImplementation(DbFixture.DbContext);
        var created = DateTimeOffset.UnixEpoch.AddDays(1);

        await repository.UpsertAsync(Entity(true, 30, created, "creator"));
        await repository.UpsertAsync(Entity(false, 90, DateTimeOffset.UnixEpoch.AddDays(2), "editor"));
        DbFixture.DbContext.ChangeTracker.Clear();

        var result = await repository.GetAsync(_org);
        Assert.NotNull(result);
        Assert.False(result.UndeployOnInactivity);
        Assert.Equal(90, result.InactivityPeriodDays);
        Assert.Equal(created, result.Created);
        Assert.Equal("creator", result.CreatedBy);
        Assert.Equal("editor", result.LastModifiedBy);
        Assert.Equal(1, await DbFixture.DbContext.OrgSettings.CountAsync(o => o.Org == _org));
    }

    [Fact]
    public async Task OrgColumn_ShouldBeUnique()
    {
        var repository = new OrgSettingsRepositoryImplementation(DbFixture.DbContext);
        await repository.UpsertAsync(Entity(true, 30, DateTimeOffset.UtcNow, "creator"));
        DbFixture.DbContext.ChangeTracker.Clear();

        DbFixture.DbContext.OrgSettings.Add(
            new Altinn.Studio.Designer.Repository.ORMImplementation.Models.OrgSettingsDbModel
            {
                Org = _org,
                UndeployOnInactivity = false,
                InactivityPeriodDays = 30,
                Created = DateTimeOffset.UtcNow,
            }
        );

        await Assert.ThrowsAsync<DbUpdateException>(() => DbFixture.DbContext.SaveChangesAsync());
        DbFixture.DbContext.ChangeTracker.Clear();
    }

    private OrgSettingsEntity Entity(bool undeploy, int periodDays, DateTimeOffset created, string developer) =>
        new()
        {
            Org = _org,
            UndeployOnInactivity = undeploy,
            InactivityPeriodDays = periodDays,
            Created = created,
            CreatedBy = developer,
            LastModifiedBy = developer,
        };
}
