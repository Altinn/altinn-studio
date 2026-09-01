using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Repository.Models;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.AdminAuditLogRepository;

public class UpdateStatusAsyncTests : DbIntegrationTestsBase
{
    public UpdateStatusAsyncTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task UpdateStatusAsync_ShouldUpdateStatusOfGivenEntryOnly()
    {
        string org = Guid.NewGuid().ToString();
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.AdminAuditLogRepository(
            DbFixture.DbContext
        );
        long entryId = await repository.AddAsync(GenerateRequestedEntry(org));
        long otherEntryId = await repository.AddAsync(GenerateRequestedEntry(org));

        await repository.UpdateStatusAsync(entryId, AdminAuditStatuses.Completed);

        var updatedEntry = await DbFixture.DbContext.AdminAuditLog.AsNoTracking().SingleAsync(e => e.Id == entryId);
        var otherEntry = await DbFixture.DbContext.AdminAuditLog.AsNoTracking().SingleAsync(e => e.Id == otherEntryId);
        Assert.Equal(AdminAuditStatuses.Completed, updatedEntry.Status);
        Assert.Equal(AdminAuditStatuses.Requested, otherEntry.Status);
    }

    private static AdminAuditLogEntry GenerateRequestedEntry(string org) =>
        new()
        {
            Org = org,
            Env = "tt02",
            App = "test-app",
            InstanceId = Guid.NewGuid().ToString(),
            Action = AdminAuditActions.DeleteInstance,
            Status = AdminAuditStatuses.Requested,
            UserName = "testDeveloper",
            Timestamp = DateTimeOffset.UtcNow,
        };
}
