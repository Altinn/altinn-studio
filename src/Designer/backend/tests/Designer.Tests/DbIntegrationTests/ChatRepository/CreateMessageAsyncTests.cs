using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Repository.Models;
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
            allowAppChanges: true,
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
        Assert.True(retrievedMessage.AllowAppChanges);
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
        Assert.Null(retrievedMessage.AllowAppChanges);
        Assert.Null(retrievedMessage.AttachmentFileNames);
        Assert.Null(retrievedMessage.FilesChanged);
    }

    [Fact]
    public async Task CreateMessageAsync_WithSources_ShouldPersistSourcesAsJsonb()
    {
        var threadEntity = EntityGenerationUtils.Chat.GenerateChatThreadEntity();
        await DbFixture.PrepareThreadInDatabase(threadEntity);

        var expectedSources = new List<ChatSourceEntity>
        {
            new()
            {
                Tool = "search",
                Title = "Altinn Docs",
                PreviewText = "Documentation about form layouts",
                ContentLength = 4096,
                Url = "https://docs.altinn.studio",
                Relevance = 0.95,
                MatchedTerms = "form layout",
                Cited = true,
            },
            new()
            {
                Tool = "search",
                Title = "GitHub Issue",
                PreviewText = "Related issue discussion",
            },
        };

        var messageEntity = EntityGenerationUtils.Chat.GenerateChatMessageEntity(
            threadId: threadEntity.Id,
            role: Role.Assistant,
            sources: expectedSources
        );

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        var createdMessage = await repository.CreateMessageAsync(messageEntity);

        var retrievedMessage = await DbFixture
            .DbContext.ChatMessages.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == createdMessage.Id);

        Assert.NotNull(retrievedMessage);
        Assert.NotNull(retrievedMessage.Sources);

        List<ChatSourceEntity> actualSources = JsonSerializer.Deserialize<List<ChatSourceEntity>>(
            retrievedMessage.Sources
        );

        Assert.NotNull(actualSources);
        Assert.Equal(2, actualSources.Count);

        Assert.Equal("Altinn Docs", actualSources[0].Title);
        Assert.Equal(4096, actualSources[0].ContentLength);
        Assert.Equal(0.95, actualSources[0].Relevance);
        Assert.Equal("form layout", actualSources[0].MatchedTerms);
        Assert.True(actualSources[0].Cited);

        Assert.Equal("GitHub Issue", actualSources[1].Title);
        Assert.Null(actualSources[1].ContentLength);
        Assert.Null(actualSources[1].Relevance);
        Assert.Null(actualSources[1].Cited);
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
