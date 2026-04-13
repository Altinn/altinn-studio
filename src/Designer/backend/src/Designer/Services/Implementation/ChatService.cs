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
        ChatThreadEntity thread = await GetThreadByIdAsync(threadId, cancellationToken);
        VerifyUserOwnsThread(thread, context);
        thread.Title = request.Title;
        await repository.UpdateThreadAsync(thread, cancellationToken);
    }

    public async Task DeleteThreadAsync(
        Guid threadId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        ChatThreadEntity? thread = await repository.GetThreadByIdAsync(threadId, cancellationToken);
        if (thread is null)
            return;

        VerifyUserOwnsThread(thread, context);
        await repository.DeleteThreadAsync(threadId, cancellationToken);
    }

    public async Task<List<ChatMessageEntity>> GetMessagesAsync(
        Guid threadId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        ChatThreadEntity thread = await GetThreadByIdAsync(threadId, cancellationToken);
        VerifyUserOwnsThread(thread, context);
        return await repository.GetMessagesAsync(threadId, cancellationToken);
    }

    public async Task<ChatMessageEntity> CreateMessageAsync(
        Guid threadId,
        CreateChatMessageRequest request,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        ChatThreadEntity thread = await GetThreadByIdAsync(threadId, cancellationToken);
        VerifyUserOwnsThread(thread, context);

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

    private async Task<ChatThreadEntity> GetThreadByIdAsync(Guid threadId, CancellationToken cancellationToken)
    {
        return await repository.GetThreadByIdAsync(threadId, cancellationToken)
            ?? throw new KeyNotFoundException($"Chat thread with id '{threadId}' was not found.");
    }

    private static void VerifyUserOwnsThread(ChatThreadEntity thread, AltinnRepoEditingContext context)
    {
        if (thread.CreatedBy != context.Developer)
            throw new UnauthorizedAccessException($"User does not have access to chat thread '{thread.Id}'.");
    }
}
