using System;
using System.Threading.Tasks;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ChatRepository;

public class GetDeveloperThreadAsyncTests : DbIntegrationTestsBase
{
    public GetDeveloperThreadAsyncTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task GetDeveloperThreadAsync_ShouldReturnTheThreadWithItsOrgAndApp()
    {
        var thread = EntityGenerationUtils.Chat.GenerateChatThreadEntity();
        await DbFixture.PrepareThreadInDatabase(thread);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);

        var result = await repository.GetDeveloperThreadAsync(thread.Id, thread.CreatedBy);

        Assert.NotNull(result);
        Assert.Equal(thread.Org, result.Org);
        Assert.Equal(thread.App, result.App);
    }

    [Fact]
    public async Task GetDeveloperThreadAsync_ShouldNotReturnAnotherDevelopersThread()
    {
        var thread = EntityGenerationUtils.Chat.GenerateChatThreadEntity(createdBy: "userA");
        await DbFixture.PrepareThreadInDatabase(thread);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);

        var result = await repository.GetDeveloperThreadAsync(thread.Id, "userB");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetDeveloperThreadAsync_ShouldReturnNullForAnUnknownThread()
    {
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ChatRepository(DbFixture.DbContext);

        var result = await repository.GetDeveloperThreadAsync(
            Guid.NewGuid(),
            EntityGenerationUtils.Chat.DefaultCreatedBy
        );

        Assert.Null(result);
    }
}
