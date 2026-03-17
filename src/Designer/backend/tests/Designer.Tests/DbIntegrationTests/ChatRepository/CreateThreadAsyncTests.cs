using System;
using System.Threading.Tasks;
using Altinn.AccessManagement.Tests.Utils;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ChatRepository;

public class CreateThreadAsyncTests : DbIntegrationTestsBase
{
    private static readonly TimeSpan TimestampTolerance = TimeSpan.FromMilliseconds(100);

    public CreateThreadAsyncTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task CreateThreadAsync_ShouldInsertThreadInDatabase()
    {
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        var threadEntity = EntityGenerationUtils.Chat.GenerateChatThreadEntity();

        var createdThread = await repository.CreateThreadAsync(threadEntity);

        var retrievedThread = await DbFixture
            .DbContext.ChatThreads.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == createdThread.Id);

        Assert.NotNull(retrievedThread);
        Assert.Equal(threadEntity.Title, retrievedThread.Title);
        Assert.Equal(threadEntity.Org, retrievedThread.Org);
        Assert.Equal(threadEntity.App, retrievedThread.App);
        Assert.Equal(threadEntity.CreatedBy, retrievedThread.CreatedBy);
        AssertionUtil.AssertCloseTo(threadEntity.CreatedAt, retrievedThread.CreatedAt, TimestampTolerance);
    }
}
