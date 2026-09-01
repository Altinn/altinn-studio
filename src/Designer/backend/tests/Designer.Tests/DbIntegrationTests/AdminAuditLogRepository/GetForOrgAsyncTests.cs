using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Repository.Models;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.AdminAuditLogRepository;

public class GetForOrgAsyncTests : DbIntegrationTestsBase
{
    public GetForOrgAsyncTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task GetForOrgAsync_ShouldReturnEntriesForOrgOrderedByTimestampDescending()
    {
        string org = Guid.NewGuid().ToString();
        string otherOrg = Guid.NewGuid().ToString();
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.AdminAuditLogRepository(
            DbFixture.DbContext
        );
        var baseTime = DateTimeOffset.UtcNow;
        await repository.AddAsync(GenerateEntry(org, "app-one", baseTime.AddMinutes(-10)));
        await repository.AddAsync(GenerateEntry(org, "app-two", baseTime));
        await repository.AddAsync(GenerateEntry(otherOrg, "app-three", baseTime));

        var entries = await repository.GetForOrgAsync(org);

        Assert.Equal(2, entries.Count);
        Assert.Equal("app-two", entries[0].App);
        Assert.Equal("app-one", entries[1].App);
        Assert.All(entries, entry => Assert.Equal(org, entry.Org));
    }

    private static AdminAuditLogEntry GenerateEntry(string org, string app, DateTimeOffset timestamp) =>
        new()
        {
            Org = org,
            Env = "tt02",
            App = app,
            InstanceId = Guid.NewGuid().ToString(),
            Action = AdminAuditActions.DeleteInstance,
            Status = AdminAuditStatuses.Completed,
            UserName = "testDeveloper",
            Timestamp = timestamp,
        };
}
