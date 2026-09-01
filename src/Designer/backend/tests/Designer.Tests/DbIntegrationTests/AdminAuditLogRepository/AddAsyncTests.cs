using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Repository.Models;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.AdminAuditLogRepository;

public class AddAsyncTests : DbIntegrationTestsBase
{
    public AddAsyncTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task AddAsync_ShouldInsertEntryInDatabaseAndReturnEntryId()
    {
        string org = Guid.NewGuid().ToString();
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.AdminAuditLogRepository(
            DbFixture.DbContext
        );
        var entry = new AdminAuditLogEntry
        {
            Org = org,
            Env = "tt02",
            App = "test-app",
            InstanceId = "51e58b12-6de1-4d0f-9052-ec2ee9d43adf",
            Action = AdminAuditActions.DeleteInstance,
            Status = AdminAuditStatuses.Requested,
            UserName = "testDeveloper",
            Timestamp = new DateTimeOffset(2026, 8, 31, 12, 0, 0, TimeSpan.Zero),
        };

        long entryId = await repository.AddAsync(entry);

        var dbEntry = await DbFixture.DbContext.AdminAuditLog.AsNoTracking().SingleOrDefaultAsync(e => e.Org == org);

        Assert.NotNull(dbEntry);
        Assert.Equal(entryId, dbEntry.Id);
        Assert.Equal(entry.Env, dbEntry.Env);
        Assert.Equal(entry.App, dbEntry.App);
        Assert.Equal(entry.InstanceId, dbEntry.InstanceId);
        Assert.Equal(entry.Action, dbEntry.Action);
        Assert.Equal(entry.Status, dbEntry.Status);
        Assert.Equal(entry.UserName, dbEntry.UserName);
        Assert.Equal(entry.Timestamp.UtcDateTime, dbEntry.Timestamp.UtcDateTime);
    }
}
