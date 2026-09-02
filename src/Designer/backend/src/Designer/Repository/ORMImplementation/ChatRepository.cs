using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

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
    public async Task<ChatThreadEntity?> GetThreadAsync(
        Guid threadId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        var dbModel = await _dbContext
            .ChatThreads.AsNoTracking()
            .FirstOrDefaultAsync(
                t =>
                    t.Id == threadId
                    && t.Org == context.Org
                    && t.App == context.Repo
                    && t.CreatedBy == context.Developer,
                cancellationToken
            );

        return dbModel is null ? null : ChatThreadMapper.MapToModel(dbModel);
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
        var dbModel = ChatThreadMapper.MapToDbModel(thread);
        _dbContext.ChatThreads.Update(dbModel);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task DeleteThreadAsync(Guid id, CancellationToken cancellationToken = default)
    {
        int rowsAffected = await _dbContext.ChatThreads.Where(t => t.Id == id).ExecuteDeleteAsync(cancellationToken);

        if (rowsAffected == 0)
        {
            throw new KeyNotFoundException($"Chat thread with id '{id}' was not found.");
        }
    }

    /// <inheritdoc />
    public async Task<int> DeleteInactiveThreadsAsync(DateTime cutoff, CancellationToken cancellationToken = default)
    {
        return await _dbContext
            .ChatThreads.Where(thread =>
                thread.CreatedAt < cutoff
                && _dbContext
                    .ChatMessages.Where(message => message.ThreadId == thread.Id)
                    .All(message => message.CreatedAt < cutoff)
            )
            .ExecuteDeleteAsync(cancellationToken);
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
        ChatMessageEntity message,
        CancellationToken cancellationToken = default
    )
    {
        // Written at most once per thread; the unique index settles races.
        if (message.EventId is not null)
        {
            ChatMessageEntity? alreadyPersisted = await FindByEventIdAsync(
                message.ThreadId,
                message.EventId,
                cancellationToken
            );
            if (alreadyPersisted is not null)
            {
                return alreadyPersisted;
            }
        }

        var dbModel = ChatMessageMapper.MapToDbModel(message);
        _dbContext.ChatMessages.Add(dbModel);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (message.EventId is not null && IsUniqueViolation(ex))
        {
            _dbContext.Entry(dbModel).State = EntityState.Detached;
            ChatMessageEntity? winner = await FindByEventIdAsync(message.ThreadId, message.EventId, cancellationToken);
            if (winner is null)
            {
                throw;
            }
            return winner;
        }

        return ChatMessageMapper.MapToModel(dbModel);
    }

    /// <inheritdoc />
    public async Task DeleteMessageAsync(Guid threadId, Guid messageId, CancellationToken cancellationToken = default)
    {
        await _dbContext
            .ChatMessages.Where(m => m.ThreadId == threadId && m.Id == messageId)
            .ExecuteDeleteAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<bool> SetFeedbackAsync(
        string traceId,
        bool? thumbsUp,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        int rowsAffected = await _dbContext
            .ChatMessages.Where(m =>
                m.TraceId == traceId
                && _dbContext.ChatThreads.Any(t =>
                    t.Id == m.ThreadId
                    && t.Org == context.Org
                    && t.App == context.Repo
                    && t.CreatedBy == context.Developer
                )
            )
            .ExecuteUpdateAsync(setters => setters.SetProperty(m => m.FeedbackThumbsUp, thumbsUp), cancellationToken);

        return rowsAffected > 0;
    }

    private async Task<ChatMessageEntity?> FindByEventIdAsync(
        Guid threadId,
        string eventId,
        CancellationToken cancellationToken
    )
    {
        ChatMessageDbModel? existing = await _dbContext
            .ChatMessages.AsNoTracking()
            .FirstOrDefaultAsync(m => m.ThreadId == threadId && m.EventId == eventId, cancellationToken);

        return existing is null ? null : ChatMessageMapper.MapToModel(existing);
    }

    private static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}
