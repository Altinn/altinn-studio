using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class ChatService(IChatRepository repository) : IChatService
{
    public async Task<List<ChatThreadEntity>> GetThreadsAsync(
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        return await repository.GetThreadsAsync(context, cancellationToken);
    }

    public async Task<ChatThreadEntity> CreateThreadAsync(
        string title,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        var thread = new ChatThreadEntity
        {
            Id = Guid.CreateVersion7(),
            Title = title,
            Org = context.Org,
            App = context.Repo,
            CreatedBy = context.Developer,
            CreatedAt = DateTime.UtcNow,
        };

        return await repository.CreateThreadAsync(thread, cancellationToken);
    }

    public async Task UpdateThreadAsync(
        Guid threadId,
        UpdateChatThreadRequest request,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        ChatThreadEntity thread = await GetOwnedThreadAsync(threadId, context, cancellationToken);
        thread.Title = request.Title;
        await repository.UpdateThreadAsync(thread, cancellationToken);
    }

    public async Task DeleteThreadAsync(
        Guid threadId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        ChatThreadEntity? thread = await repository.GetThreadAsync(threadId, context, cancellationToken);
        if (thread is null)
            return;

        await repository.DeleteThreadAsync(threadId, cancellationToken);
    }

    public async Task<List<ChatMessageEntity>> GetMessagesAsync(
        Guid threadId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        await GetOwnedThreadAsync(threadId, context, cancellationToken);
        return await repository.GetMessagesAsync(threadId, cancellationToken);
    }

    public async Task<ChatMessageEntity> CreateMessageAsync(
        Guid threadId,
        CreateChatMessageRequest request,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        await GetOwnedThreadAsync(threadId, context, cancellationToken);

        if (!Enum.TryParse<Role>(request.Role, ignoreCase: true, out var parsedRole))
        {
            throw new ArgumentException($"Invalid role: '{request.Role}'. Must be 'User' or 'Assistant'.");
        }

        var message = new ChatMessageEntity
        {
            Id = Guid.CreateVersion7(),
            ThreadId = threadId,
            CreatedAt = DateTime.UtcNow,
            Role = parsedRole,
            Content = request.Content,
            AllowAppChanges = request.AllowAppChanges,
            AttachmentFileNames = request.AttachmentFileNames,
            FilesChanged = request.FilesChanged,
            Sources = request
                .Sources?.Select(s => new ChatSourceEntity
                {
                    Tool = s.Tool,
                    Title = s.Title,
                    PreviewText = s.PreviewText,
                    ContentLength = s.ContentLength,
                    Url = s.Url,
                    Relevance = s.Relevance,
                    MatchedTerms = s.MatchedTerms,
                    Cited = s.Cited,
                })
                .ToList(),
        };

        return await repository.CreateMessageAsync(message, cancellationToken);
    }

    public async Task DeleteMessageAsync(
        Guid threadId,
        Guid messageId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        await GetOwnedThreadAsync(threadId, context, cancellationToken);
        await repository.DeleteMessageAsync(threadId, messageId, cancellationToken);
    }

    private async Task<ChatThreadEntity> GetOwnedThreadAsync(
        Guid threadId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken
    )
    {
        return await repository.GetThreadAsync(threadId, context, cancellationToken)
            ?? throw new KeyNotFoundException($"Chat thread with id '{threadId}' was not found.");
    }
}
