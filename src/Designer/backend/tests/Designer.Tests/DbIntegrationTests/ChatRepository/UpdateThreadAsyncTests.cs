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
    public async Task UpdateThreadAsync_ShouldUpdateOnlyTitle()
    {
        var threadEntity = EntityGenerationUtils.Chat.GenerateChatThreadEntity();
        await DbFixture.PrepareThreadInDatabase(threadEntity);

        string updatedTitle = "Updated Thread Title";
        var updateEntity = new ChatThreadEntity
        {
            Id = threadEntity.Id,
            Title = updatedTitle,
            Org = threadEntity.Org,
            App = threadEntity.App,
            CreatedBy = threadEntity.CreatedBy,
            CreatedAt = threadEntity.CreatedAt,
        };

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        await repository.UpdateThreadAsync(updateEntity);

        var retrievedThread = await DbFixture
            .DbContext.ChatThreads.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == threadEntity.Id);

        Assert.NotNull(retrievedThread);
        Assert.Equal(updatedTitle, retrievedThread.Title);
        Assert.Equal(threadEntity.Org, retrievedThread.Org);
        Assert.Equal(threadEntity.App, retrievedThread.App);
        Assert.Equal(threadEntity.CreatedBy, retrievedThread.CreatedBy);
        AssertionUtil.AssertCloseTo(threadEntity.CreatedAt, retrievedThread.CreatedAt, TimestampTolerance);
    }

    [Fact]
    public async Task UpdateThreadAsync_WithNonExistentThread_ShouldNotThrow()
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

        var exception = await Record.ExceptionAsync(() => repository.UpdateThreadAsync(nonExistentUpdateEntity));

        Assert.Null(exception);
    }
}
