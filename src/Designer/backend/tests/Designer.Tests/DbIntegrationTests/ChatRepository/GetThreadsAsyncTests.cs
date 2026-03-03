using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ChatRepository;

public class GetThreadsAsyncTests : DbIntegrationTestsBase
{
    public GetThreadsAsyncTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task GetThreadsAsync_ShouldReturnThreadsOrderedByNewestFirst()
    {
        string org = EntityGenerationUtils.Chat.DefaultOrg;
        string app = EntityGenerationUtils.Chat.GenerateUniqueAppName();
        string developer = EntityGenerationUtils.Chat.DefaultCreatedBy;

        var baseTime = DateTime.UtcNow;
        var firstThread = EntityGenerationUtils.Chat.GenerateChatThreadEntity(org, app, developer, createdAt: baseTime);
        var secondThread = EntityGenerationUtils.Chat.GenerateChatThreadEntity(
            org,
            app,
            developer,
            createdAt: baseTime.AddSeconds(1)
        );
        var thirdThread = EntityGenerationUtils.Chat.GenerateChatThreadEntity(
            org,
            app,
            developer,
            createdAt: baseTime.AddSeconds(2)
        );

        await DbFixture.PrepareThreadInDatabase(firstThread);
        await DbFixture.PrepareThreadInDatabase(secondThread);
        await DbFixture.PrepareThreadInDatabase(thirdThread);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

        var result = await repository.GetThreadsAsync(context);

        Assert.Equal(3, result.Count);
        Assert.Equal(thirdThread.Id, result[0].Id);
        Assert.Equal(secondThread.Id, result[1].Id);
        Assert.Equal(firstThread.Id, result[2].Id);
    }

    [Fact]
    public async Task GetThreadsAsync_WithNonMatchingContext_ShouldReturnEmptyList()
    {
        string org = EntityGenerationUtils.Chat.DefaultOrg;
        string app = EntityGenerationUtils.Chat.GenerateUniqueAppName();

        var thread = EntityGenerationUtils.Chat.GenerateChatThreadEntity(
            org,
            app,
            EntityGenerationUtils.Chat.DefaultCreatedBy
        );
        await DbFixture.PrepareThreadInDatabase(thread);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        var nonMatchingApp = EntityGenerationUtils.Chat.GenerateUniqueAppName();
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            org,
            nonMatchingApp,
            EntityGenerationUtils.Chat.DefaultCreatedBy
        );

        var result = await repository.GetThreadsAsync(context);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetThreadsAsync_ShouldNotReturnThreadsFromOtherUsers()
    {
        string org = EntityGenerationUtils.Chat.DefaultOrg;
        string app = EntityGenerationUtils.Chat.GenerateUniqueAppName();

        var userAThread = EntityGenerationUtils.Chat.GenerateChatThreadEntity(org, app, "userA");
        var userBThread = EntityGenerationUtils.Chat.GenerateChatThreadEntity(org, app, "userB");

        await DbFixture.PrepareThreadInDatabase(userAThread);
        await DbFixture.PrepareThreadInDatabase(userBThread);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, "userA");

        var result = await repository.GetThreadsAsync(context);

        Assert.Single(result);
        Assert.Equal(userAThread.Id, result.First().Id);
    }
}
