using System;
using System.Threading.Tasks;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Studio.Designer.Repository.Models;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ChatRepository;

public class UpdateThreadAsyncTests : DbIntegrationTestsBase
{
    private static readonly TimeSpan TimestampTolerance = TimeSpan.FromMilliseconds(100);

    public UpdateThreadAsyncTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task UpdateThreadAsync_ShouldUpdateAllFields()
    {
        var threadEntity = EntityGenerationUtils.Chat.GenerateChatThreadEntity();
        await DbFixture.PrepareThreadInDatabase(threadEntity);

        var updateEntity = new ChatThreadEntity
        {
            Id = threadEntity.Id,
            Title = "updated-title",
            Org = "updated-org",
            App = "updated-app",
            CreatedBy = "updated-user",
            CreatedAt = DateTime.UtcNow.AddDays(-1),
        };

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        await repository.UpdateThreadAsync(updateEntity);

        var retrievedThread = await DbFixture
            .DbContext.ChatThreads.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == threadEntity.Id);

        Assert.NotNull(retrievedThread);
        Assert.Equal(updateEntity.Title, retrievedThread.Title);
        Assert.Equal(updateEntity.Org, retrievedThread.Org);
        Assert.Equal(updateEntity.App, retrievedThread.App);
        Assert.Equal(updateEntity.CreatedBy, retrievedThread.CreatedBy);
        AssertionUtil.AssertCloseTo(updateEntity.CreatedAt, retrievedThread.CreatedAt, TimestampTolerance);
    }

    [Fact]
    public async Task UpdateThreadAsync_WithNonExistentThread_ShouldThrowDbUpdateConcurrencyException()
    {
        var nonExistentUpdateEntity = new ChatThreadEntity
        {
            Id = Guid.NewGuid(),
            Title = "This thread does not exist",
            Org = EntityGenerationUtils.Chat.DefaultOrg,
            App = EntityGenerationUtils.Chat.GenerateUniqueAppName(),
            CreatedBy = EntityGenerationUtils.Chat.DefaultCreatedBy,
            CreatedAt = DateTime.UtcNow,
        };

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() =>
            repository.UpdateThreadAsync(nonExistentUpdateEntity)
        );

        DbFixture.DbContext.ChangeTracker.Clear();
    }
}
