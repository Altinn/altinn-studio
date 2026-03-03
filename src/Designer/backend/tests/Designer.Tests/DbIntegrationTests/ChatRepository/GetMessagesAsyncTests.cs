using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ChatRepository;

public class GetMessagesAsyncTests : DbIntegrationTestsBase
{
    public GetMessagesAsyncTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task GetMessagesAsync_ShouldReturnMessagesOrderedByCreatedAtAscending()
    {
        var threadEntity = EntityGenerationUtils.Chat.GenerateChatThreadEntity();
        await DbFixture.PrepareThreadInDatabase(threadEntity);

        var baseTime = DateTime.UtcNow;
        var firstMessage = EntityGenerationUtils.Chat.GenerateChatMessageEntity(Role.User, createdAt: baseTime);
        var secondMessage = EntityGenerationUtils.Chat.GenerateChatMessageEntity(
            Role.Assistant,
            createdAt: baseTime.AddSeconds(1)
        );
        var thirdMessage = EntityGenerationUtils.Chat.GenerateChatMessageEntity(
            Role.User,
            createdAt: baseTime.AddSeconds(2)
        );

        await DbFixture.PrepareMessageInDatabase(threadEntity.Id, firstMessage);
        await DbFixture.PrepareMessageInDatabase(threadEntity.Id, secondMessage);
        await DbFixture.PrepareMessageInDatabase(threadEntity.Id, thirdMessage);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);

        var result = await repository.GetMessagesAsync(threadEntity.Id);

        Assert.Equal(3, result.Count);
        Assert.Equal(firstMessage.Id, result[0].Id);
        Assert.Equal(secondMessage.Id, result[1].Id);
        Assert.Equal(thirdMessage.Id, result[2].Id);
    }

    [Fact]
    public async Task GetMessagesAsync_WithNonExistingThreadId_ShouldReturnEmptyList()
    {
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        var nonExistingThreadId = Guid.NewGuid();

        var result = await repository.GetMessagesAsync(nonExistingThreadId);

        Assert.Empty(result);
    }
}
