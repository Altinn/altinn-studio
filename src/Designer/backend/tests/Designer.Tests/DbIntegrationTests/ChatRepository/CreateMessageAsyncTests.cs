using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Studio.Designer.Enums;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ChatRepository;

public class CreateMessageAsyncTests : DbIntegrationTestsBase
{
    private static readonly TimeSpan TimestampTolerance = TimeSpan.FromMilliseconds(100);

    public CreateMessageAsyncTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task CreateMessageAsync_ShouldInsertMessageInDatabase()
    {
        var threadEntity = EntityGenerationUtils.Chat.GenerateChatThreadEntity();
        await DbFixture.PrepareThreadInDatabase(threadEntity);

        var expectedAttachments = new List<string> { "file1.txt", "file2.txt" };
        var expectedFilesChanged = new List<string> { "App/ui/layout.json" };

        var messageEntity = EntityGenerationUtils.Chat.GenerateChatMessageEntity(
            threadId: threadEntity.Id,
            role: Role.User,
            actionMode: ActionMode.Edit,
            attachmentFileNames: expectedAttachments,
            filesChanged: expectedFilesChanged
        );

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        var createdMessage = await repository.CreateMessageAsync(messageEntity);

        var retrievedMessage = await DbFixture
            .DbContext.ChatMessages.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == createdMessage.Id);

        Assert.NotNull(retrievedMessage);
        Assert.Equal(threadEntity.Id, retrievedMessage.ThreadId);
        Assert.Equal(messageEntity.Role, retrievedMessage.Role);
        Assert.Equal(messageEntity.Content, retrievedMessage.Content);
        Assert.Equal(ActionMode.Edit, retrievedMessage.ActionMode);
        Assert.Equal(expectedAttachments, retrievedMessage.AttachmentFileNames);
        Assert.Equal(expectedFilesChanged, retrievedMessage.FilesChanged);
        AssertionUtil.AssertCloseTo(messageEntity.CreatedAt, retrievedMessage.CreatedAt, TimestampTolerance);
    }

    [Fact]
    public async Task CreateMessageAsync_WithNullOptionalFields_ShouldInsertWithNulls()
    {
        var threadEntity = EntityGenerationUtils.Chat.GenerateChatThreadEntity();
        await DbFixture.PrepareThreadInDatabase(threadEntity);

        var messageEntity = EntityGenerationUtils.Chat.GenerateChatMessageEntity(
            threadId: threadEntity.Id,
            role: Role.Assistant
        );

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        var createdMessage = await repository.CreateMessageAsync(messageEntity);

        var retrievedMessage = await DbFixture
            .DbContext.ChatMessages.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == createdMessage.Id);

        Assert.NotNull(retrievedMessage);
        Assert.Null(retrievedMessage.ActionMode);
        Assert.Null(retrievedMessage.AttachmentFileNames);
        Assert.Null(retrievedMessage.FilesChanged);
    }

    [Fact]
    public async Task CreateMessageAsync_WithNonExistentThread_ShouldThrowDbUpdateException()
    {
        var messageEntity = EntityGenerationUtils.Chat.GenerateChatMessageEntity(
            threadId: Guid.NewGuid(),
            role: Role.User
        );

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);

        await Assert.ThrowsAsync<DbUpdateException>(() => repository.CreateMessageAsync(messageEntity));

        DbFixture.DbContext.ChangeTracker.Clear();
    }
}
