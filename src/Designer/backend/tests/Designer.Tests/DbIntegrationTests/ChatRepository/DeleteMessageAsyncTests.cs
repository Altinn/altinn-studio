using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ChatRepository;

public class DeleteMessageAsyncTests : DbIntegrationTestsBase
{
    public DeleteMessageAsyncTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task DeleteMessageAsync_ShouldDeleteOnlyTargetMessage()
    {
        var threadEntity = EntityGenerationUtils.Chat.GenerateChatThreadEntity();
        await DbFixture.PrepareThreadInDatabase(threadEntity);

        var messageToDelete = EntityGenerationUtils.Chat.GenerateChatMessageEntity(
            threadId: threadEntity.Id,
            role: Role.User
        );
        var messageToKeep = EntityGenerationUtils.Chat.GenerateChatMessageEntity(
            threadId: threadEntity.Id,
            role: Role.Assistant
        );

        await DbFixture.PrepareMessageInDatabase(messageToDelete);
        await DbFixture.PrepareMessageInDatabase(messageToKeep);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        await repository.DeleteMessageAsync(threadEntity.Id, messageToDelete.Id);

        var deletedMessage = await DbFixture
            .DbContext.ChatMessages.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == messageToDelete.Id);
        var remainingMessage = await DbFixture
            .DbContext.ChatMessages.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == messageToKeep.Id);

        Assert.Null(deletedMessage);
        Assert.NotNull(remainingMessage);
    }

    [Fact]
    public async Task DeleteMessageAsync_WithNonExistentMessage_ShouldNotThrow()
    {
        var threadEntity = EntityGenerationUtils.Chat.GenerateChatThreadEntity();
        await DbFixture.PrepareThreadInDatabase(threadEntity);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);

        await repository.DeleteMessageAsync(threadEntity.Id, Guid.NewGuid());
    }
}
