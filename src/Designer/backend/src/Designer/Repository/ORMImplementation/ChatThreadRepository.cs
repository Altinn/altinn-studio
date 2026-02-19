#nullable disable
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class ChatThreadRepository : IChatThreadRepository
{
    private readonly DesignerdbContext _dbContext;

    public ChatThreadRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <inheritdoc />
    public async Task<ChatThreadEntity> GetThreadAsync(long id, CancellationToken cancellationToken = default)
    {
        var thread = await _dbContext.ChatThreads.AsNoTracking()
            .AsSplitQuery()
            .Include(t => t.Messages.OrderBy(m => m.CreatedAt))
                .ThenInclude(m => m.Attachments)
            .SingleOrDefaultAsync(t => t.Id == id, cancellationToken);

        return thread is null ? null : ChatThreadMapper.MapToModel(thread);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<ChatThreadTitle>> GetThreadTitlesAsync(string org, string app, string createdBy, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ChatThreads.AsNoTracking()
            .Where(t => t.Org == org && t.App == app && t.CreatedBy == createdBy)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new ChatThreadTitle(t.Id, t.Title, t.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<ChatThreadEntity> CreateThreadAsync(ChatThreadEntity thread, CancellationToken cancellationToken = default)
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
        _dbContext.ChatThreads.Attach(dbModel);
        _dbContext.Entry(dbModel).Property(t => t.Title).IsModified = true;
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task DeleteThreadAsync(long id, CancellationToken cancellationToken = default)
    {
        var stub = new ChatThreadDbModel { Id = id };
        _dbContext.ChatThreads.Remove(stub);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<ChatMessageEntity> CreateMessageAsync(ChatMessageEntity message, CancellationToken cancellationToken = default)
    {
        var dbModel = ChatMessageMapper.MapToDbModel(message);
        _dbContext.ChatMessages.Add(dbModel);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return ChatMessageMapper.MapToModel(dbModel);
    }

    /// <inheritdoc />
    public async Task<ChatAttachmentEntity> CreateAttachmentAsync(ChatAttachmentEntity attachment, CancellationToken cancellationToken = default)
    {
        var dbModel = ChatAttachmentMapper.MapToDbModel(attachment);
        _dbContext.ChatAttachments.Add(dbModel);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return ChatAttachmentMapper.MapToModel(dbModel);
    }

    /// <inheritdoc />
    public async Task DeleteAttachmentAsync(long id, CancellationToken cancellationToken = default)
    {
        var stub = new ChatAttachmentDbModel { Id = id };
        _dbContext.ChatAttachments.Remove(stub);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
