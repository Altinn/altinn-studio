using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.AppSettings;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Microsoft.EntityFrameworkCore;
using Xunit;
using AppSettingsRepositoryImplementation = Altinn.Studio.Designer.Repository.ORMImplementation.AppSettingsRepository;

namespace Designer.Tests.DbIntegrationTests.AppSettingsRepository;

public class UpsertAsyncIntegrationTests : DbIntegrationTestsBase
{
    public UpsertAsyncIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Fact]
    public async Task UpsertAsync_WhenExistingRowFoundWithDefaultEntityVersion_ShouldUpdateWithoutConcurrencyFailure()
    {
        var org = "ttd";
        var app = TestDataHelper.GenerateTestRepoName();
        var initialCreated = DateTimeOffset.UnixEpoch.AddDays(1);

        var existing = new AppSettingsDbModel
        {
            Org = org,
            App = app,
            Environment = null,
            UndeployOnInactivity = false,
            Created = initialCreated,
            CreatedBy = "creator-1",
            LastModifiedBy = "creator-1"
        };

        await DbFixture.DbContext.AppSettings.AddAsync(existing);
        await DbFixture.DbContext.SaveChangesAsync();
        DbFixture.DbContext.Entry(existing).State = EntityState.Detached;

        var repository = new AppSettingsRepositoryImplementation(DbFixture.DbContext);
        var upsertEntity = new AppSettingsEntity
        {
            Org = org,
            App = app,
            Environment = null,
            UndeployOnInactivity = true,
            Created = DateTimeOffset.UnixEpoch.AddDays(2),
            CreatedBy = "creator-2",
            LastModifiedBy = "developer-2",
            Version = 0
        };

        var result = await repository.UpsertAsync(upsertEntity);
        var dbRecord = await DbFixture.DbContext.AppSettings.AsNoTracking().SingleAsync(a => a.Org == org && a.App == app && a.Environment == null);

        Assert.True(result.Version > 0);
        Assert.True(result.UndeployOnInactivity);
        Assert.Equal("developer-2", result.LastModifiedBy);

        Assert.Equal(initialCreated, dbRecord.Created);
        Assert.Equal("creator-1", dbRecord.CreatedBy);
        Assert.True(dbRecord.UndeployOnInactivity);
        Assert.Equal("developer-2", dbRecord.LastModifiedBy);
    }
}
