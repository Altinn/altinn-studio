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
        List<ChatThreadEntity> threads = await repository.GetThreadsAsync(context, cancellationToken);
        ChatThreadEntity existingThread =
            threads.Find(t => t.Id == threadId)
            ?? throw new KeyNotFoundException($"Chat thread with id '{threadId}' was not found.");

        existingThread.Title = title;
        await repository.UpdateThreadAsync(existingThread, cancellationToken);
    }

    public async Task DeleteThreadAsync(Guid threadId, CancellationToken cancellationToken = default)
    {
        await repository.DeleteThreadAsync(threadId, cancellationToken);
    }

    public async Task<List<ChatMessageEntity>> GetMessagesAsync(
        Guid threadId,
        CancellationToken cancellationToken = default
    )
    {
        return await repository.GetMessagesAsync(threadId, cancellationToken);
    }

    public async Task<ChatMessageEntity> CreateMessageAsync(
        Guid threadId,
        string role,
        string content,
        string? actionMode,
        List<string>? attachmentFileNames,
        List<string>? filesChanged,
        CancellationToken cancellationToken = default
    )
    {
        var message = new ChatMessageEntity
        {
            Id = Guid.CreateVersion7(),
            ThreadId = threadId,
            CreatedAt = DateTime.UtcNow,
            Role = Enum.Parse<Role>(role, ignoreCase: true),
            Content = content,
            ActionMode = actionMode is not null ? Enum.Parse<ActionMode>(actionMode, ignoreCase: true) : null,
            AttachmentFileNames = attachmentFileNames,
            FilesChanged = filesChanged,
        };

        return await repository.CreateMessageAsync(message, cancellationToken);
    }
}
