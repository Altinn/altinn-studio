using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ChatRepository;

public class DeleteInactiveThreadsAsyncTests : DbIntegrationTestsBase
{
    private static readonly DateTime s_cutoffTimestamp = new(2025, 4, 1, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime s_beforeCutoff = s_cutoffTimestamp.AddDays(-1);
    private static readonly DateTime s_afterCutoff = s_cutoffTimestamp.AddDays(1);

    public DeleteInactiveThreadsAsyncTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task DeleteInactiveThreadsAsync_DeletesThreadWhereAllMessagesAreOlderThanCutoff()
    {
        var inactiveThread = EntityGenerationUtils.Chat.GenerateChatThreadEntity(createdAt: s_beforeCutoff);
        await DbFixture.PrepareThreadInDatabase(inactiveThread);

        var oldMessage = EntityGenerationUtils.Chat.GenerateChatMessageEntity(
            threadId: inactiveThread.Id,
            role: Role.User,
            createdAt: s_beforeCutoff
        );
        await DbFixture.PrepareMessageInDatabase(oldMessage);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        int deletedCount = await repository.DeleteInactiveThreadsAsync(s_cutoffTimestamp);

        Assert.Equal(1, deletedCount);
        Assert.Null(
            await DbFixture.DbContext.ChatThreads.AsNoTracking().FirstOrDefaultAsync(t => t.Id == inactiveThread.Id)
        );
        Assert.Null(
            await DbFixture.DbContext.ChatMessages.AsNoTracking().FirstOrDefaultAsync(m => m.Id == oldMessage.Id)
        );
    }

    [Fact]
    public async Task DeleteInactiveThreadsAsync_KeepsThreadWithRecentMessage()
    {
        var activeThread = EntityGenerationUtils.Chat.GenerateChatThreadEntity(createdAt: s_beforeCutoff);
        await DbFixture.PrepareThreadInDatabase(activeThread);

        var oldMessage = EntityGenerationUtils.Chat.GenerateChatMessageEntity(
            threadId: activeThread.Id,
            role: Role.User,
            createdAt: s_beforeCutoff
        );
        var recentMessage = EntityGenerationUtils.Chat.GenerateChatMessageEntity(
            threadId: activeThread.Id,
            role: Role.Assistant,
            createdAt: s_afterCutoff
        );
        await DbFixture.PrepareMessageInDatabase(oldMessage);
        await DbFixture.PrepareMessageInDatabase(recentMessage);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        int deletedCount = await repository.DeleteInactiveThreadsAsync(s_cutoffTimestamp);

        Assert.Equal(0, deletedCount);
        Assert.NotNull(
            await DbFixture.DbContext.ChatThreads.AsNoTracking().FirstOrDefaultAsync(t => t.Id == activeThread.Id)
        );
    }

    [Fact]
    public async Task DeleteInactiveThreadsAsync_DeletesEmptyThreadOlderThanCutoff()
    {
        var emptyOldThread = EntityGenerationUtils.Chat.GenerateChatThreadEntity(createdAt: s_beforeCutoff);
        await DbFixture.PrepareThreadInDatabase(emptyOldThread);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        int deletedCount = await repository.DeleteInactiveThreadsAsync(s_cutoffTimestamp);

        Assert.Equal(1, deletedCount);
        Assert.Null(
            await DbFixture.DbContext.ChatThreads.AsNoTracking().FirstOrDefaultAsync(t => t.Id == emptyOldThread.Id)
        );
    }

    [Fact]
    public async Task DeleteInactiveThreadsAsync_KeepsEmptyThreadNewerThanCutoff()
    {
        var emptyNewThread = EntityGenerationUtils.Chat.GenerateChatThreadEntity(createdAt: s_afterCutoff);
        await DbFixture.PrepareThreadInDatabase(emptyNewThread);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        int deletedCount = await repository.DeleteInactiveThreadsAsync(s_cutoffTimestamp);

        Assert.Equal(0, deletedCount);
        Assert.NotNull(
            await DbFixture.DbContext.ChatThreads.AsNoTracking().FirstOrDefaultAsync(t => t.Id == emptyNewThread.Id)
        );
    }
}
