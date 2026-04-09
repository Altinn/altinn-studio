using System;
using System.Collections.Generic;
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
        string title,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        ChatThreadEntity thread = await GetThreadByIdAsync(threadId, cancellationToken);
        VerifyThreadOwner(thread, context);
        thread.Title = title;
        await repository.UpdateThreadAsync(thread, cancellationToken);
    }

    public async Task DeleteThreadAsync(
        Guid threadId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        ChatThreadEntity thread = await repository.GetThreadByIdAsync(threadId, cancellationToken);
        if (thread is null)
            return;

        VerifyThreadOwner(thread, context);
        await repository.DeleteThreadAsync(threadId, cancellationToken);
    }

    public async Task<List<ChatMessageEntity>> GetMessagesAsync(
        Guid threadId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        ChatThreadEntity thread = await GetThreadByIdAsync(threadId, cancellationToken);
        VerifyThreadOwner(thread, context);
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
        VerifyThreadOwner(thread, context);

        if (!Enum.TryParse<Role>(request.Role, ignoreCase: true, out var parsedRole))
        {
            throw new ArgumentException($"Invalid role: '{request.Role}'. Must be 'User' or 'Assistant'.");
        }

        ActionMode? parsedActionMode = null;
        if (request.ActionMode is not null)
        {
            if (!Enum.TryParse(request.ActionMode, ignoreCase: true, out ActionMode actionModeValue))
            {
                throw new ArgumentException($"Invalid action mode: '{request.ActionMode}'.");
            }
            parsedActionMode = actionModeValue;
        }

        var message = new ChatMessageEntity
        {
            Id = Guid.CreateVersion7(),
            ThreadId = threadId,
            CreatedAt = DateTime.UtcNow,
            Role = parsedRole,
            Content = request.Content,
            ActionMode = parsedActionMode,
            AttachmentFileNames = request.AttachmentFileNames,
            FilesChanged = request.FilesChanged,
        };

        return await repository.CreateMessageAsync(message, cancellationToken);
    }

    private async Task<ChatThreadEntity> GetThreadByIdAsync(
        Guid threadId,
        CancellationToken cancellationToken
    )
    {
        return await repository.GetThreadByIdAsync(threadId, cancellationToken)
            ?? throw new KeyNotFoundException($"Chat thread with id '{threadId}' was not found.");
    }

    private static void VerifyThreadOwner(ChatThreadEntity thread, AltinnRepoEditingContext context)
    {
        if (thread.CreatedBy != context.Developer)
            throw new UnauthorizedAccessException($"User does not have access to chat thread '{thread.Id}'.");
    }
}
