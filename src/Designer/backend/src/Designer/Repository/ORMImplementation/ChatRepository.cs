using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class ChatRepository : IChatRepository
{
    private readonly DesignerdbContext _dbContext;

    public ChatRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <inheritdoc />
    public async Task<List<ChatThreadEntity>> GetThreadsAsync(
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        var threads = await _dbContext
            .ChatThreads.AsNoTracking()
            .Where(t => t.Org == context.Org && t.App == context.Repo && t.CreatedBy == context.Developer)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(cancellationToken);

        return threads.Select(ChatThreadMapper.MapToModel).ToList();
    }

    /// <inheritdoc />
    public async Task<ChatThreadEntity> CreateThreadAsync(
        ChatThreadEntity thread,
        CancellationToken cancellationToken = default
    )
    {
        var dbModel = ChatThreadMapper.MapToDbModel(thread);
        _dbContext.ChatThreads.Add(dbModel);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return ChatThreadMapper.MapToModel(dbModel);
    }

    /// <inheritdoc />
    public async Task UpdateThreadAsync(ChatThreadEntity thread, CancellationToken cancellationToken = default)
    {
        await _dbContext
            .ChatThreads.Where(t => t.Id == thread.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.Title, thread.Title), cancellationToken);
    }

    /// <inheritdoc />
    public async Task DeleteThreadAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await _dbContext.ChatThreads.Where(t => t.Id == id).ExecuteDeleteAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<List<ChatMessageEntity>> GetMessagesAsync(
        Guid threadId,
        CancellationToken cancellationToken = default
    )
    {
        var messages = await _dbContext
            .ChatMessages.AsNoTracking()
            .Where(m => m.ThreadId == threadId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        return messages.Select(ChatMessageMapper.MapToModel).ToList();
    }

    /// <inheritdoc />
    public async Task<ChatMessageEntity> CreateMessageAsync(
        Guid threadId,
        ChatMessageEntity message,
        CancellationToken cancellationToken = default
    )
    {
        var dbModel = ChatMessageMapper.MapToDbModel(message);
        dbModel.ThreadId = threadId;
        _dbContext.ChatMessages.Add(dbModel);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return ChatMessageMapper.MapToModel(dbModel);
    }
}
