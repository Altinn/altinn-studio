using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;

namespace Designer.Tests.DbIntegrationTests;

public static class ChatDesignerDbFixtureExtensions
{
    public static async Task PrepareThreadInDatabase(this DesignerDbFixture dbFixture, ChatThreadEntity threadEntity)
    {
        var dbModel = ChatThreadMapper.MapToDbModel(threadEntity);
        await dbFixture.DbContext.ChatThreads.AddAsync(dbModel);
        await dbFixture.DbContext.SaveChangesAsync();
        dbFixture.DbContext.Entry(dbModel).State = EntityState.Detached;
    }

    public static async Task PrepareMessageInDatabase(
        this DesignerDbFixture dbFixture,
        Guid threadId,
        ChatMessageEntity messageEntity
    )
    {
        var dbModel = ChatMessageMapper.MapToDbModel(messageEntity);
        dbModel.ThreadId = threadId;
        await dbFixture.DbContext.ChatMessages.AddAsync(dbModel);
        await dbFixture.DbContext.SaveChangesAsync();
        dbFixture.DbContext.Entry(dbModel).State = EntityState.Detached;
    }
}
