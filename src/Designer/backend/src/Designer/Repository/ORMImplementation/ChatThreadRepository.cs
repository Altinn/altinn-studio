namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class ChatThreadRepository : IChatThreadRepository
{
    private readonly DesignerdbContext _dbContext;

    public ChatThreadRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // To do: Remove this method. We don't need to pass the thread populated with messages to the frontend.
    // Instead we can fetch all messages based on the ThreadId. 
    // In the frontend, we can store them in cache under QueryKey "Threads, org, app, user" and "Messages, org, app, user".
    /// <inheritdoc />
    public async Task<ChatThreadEntity?> GetThreadAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var thread = await _dbContext
            .ChatThreads.AsNoTracking()
            .Include(t => t.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        return thread is null ? null : ChatThreadMapper.MapToModel(thread);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<ChatThreadEntity>> GetThreadsAsync(
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        var threads = await _dbContext
            .ChatThreads.AsNoTracking()
            .Where(t =>
                t.Org == context.Org && t.App == context.Repo && t.CreatedBy == context.Developer
            )
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(cancellationToken);

        return threads.Select(ChatThreadMapper.MapToModel);
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
    public async Task UpdateThreadAsync(
        ChatThreadEntity thread,
        CancellationToken cancellationToken = default
    )
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
