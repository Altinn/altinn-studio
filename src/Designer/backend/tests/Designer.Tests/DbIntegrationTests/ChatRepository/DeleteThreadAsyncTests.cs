using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ChatRepository;

public class DeleteThreadAsyncTests : DbIntegrationTestsBase
{
    public DeleteThreadAsyncTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task DeleteThreadAsync_ShouldDeleteThreadAndCascadeMessages()
    {
        var threadEntity = EntityGenerationUtils.Chat.GenerateChatThreadEntity();
        await DbFixture.PrepareThreadInDatabase(threadEntity);

        var messageEntity = EntityGenerationUtils.Chat.GenerateChatMessageEntity(Role.User);
        await DbFixture.PrepareMessageInDatabase(threadEntity.Id, messageEntity);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        await repository.DeleteThreadAsync(threadEntity.Id);

        var deletedThread = await DbFixture
            .DbContext.ChatThreads.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == threadEntity.Id);
        var deletedMessage = await DbFixture
            .DbContext.ChatMessages.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == messageEntity.Id);

        Assert.Null(deletedThread);
        Assert.Null(deletedMessage);
    }

    [Fact]
    public async Task DeleteThreadAsync_WithNonExistentThread_ShouldNotThrow()
    {
        var nonExistentThreadId = Guid.NewGuid();
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);

        var exception = await Record.ExceptionAsync(() => repository.DeleteThreadAsync(nonExistentThreadId));

        Assert.Null(exception);
    }
}
