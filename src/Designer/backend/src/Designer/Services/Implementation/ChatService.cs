using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class ChatService(IChatRepository repository, TimeProvider timeProvider, SchedulingSettings schedulingSettings)
    : IChatService
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

    public async Task<ChatThreadEntity?> UpdateThreadAsync(
        Guid threadId,
        UpdateChatThreadRequest request,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        ChatThreadEntity? thread = await GetOwnedThreadAsync(threadId, context, cancellationToken);
        if (thread is null)
            return null;

        thread.Title = request.Title;
        await repository.UpdateThreadAsync(thread, cancellationToken);
        return thread;
    }

    public async Task DeleteThreadAsync(
        Guid threadId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        ChatThreadEntity? thread = await GetOwnedThreadAsync(threadId, context, cancellationToken);
        if (thread is null)
            return;

        await repository.DeleteThreadAsync(threadId, cancellationToken);
    }

    public Task<int> DeleteInactiveThreadsAsync(CancellationToken cancellationToken = default)
    {
        DateTime cutoff = timeProvider
            .GetUtcNow()
            .UtcDateTime.AddDays(-schedulingSettings.ChatInactivityCleanup.RetentionDays);
        return repository.DeleteInactiveThreadsAsync(cutoff, cancellationToken);
    }

    public async Task<List<ChatMessageEntity>?> GetMessagesAsync(
        Guid threadId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        ChatThreadEntity? thread = await GetOwnedThreadAsync(threadId, context, cancellationToken);
        if (thread is null)
            return null;

        return await repository.GetMessagesAsync(threadId, cancellationToken);
    }

    public async Task<ChatMessageEntity?> CreateMessageAsync(
        Guid threadId,
        CreateChatMessageRequest request,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    )
    {
        ChatThreadEntity? thread = await GetOwnedThreadAsync(threadId, context, cancellationToken);
        if (thread is null)
            return null;

        var message = new ChatMessageEntity
        {
            Id = Guid.CreateVersion7(),
            ThreadId = threadId,
            CreatedAt = DateTime.UtcNow,
            Role = request.Role,
            Content = request.Content,
            AllowAppChanges = request.AllowAppChanges,
            AttachmentFileNames = request.AttachmentFileNames,
            FilesChanged = request.FilesChanged,
            Sources = request.Sources,
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
        ChatThreadEntity? thread = await GetOwnedThreadAsync(threadId, context, cancellationToken);
        if (thread is null)
            return;

        await repository.DeleteMessageAsync(threadId, messageId, cancellationToken);
    }

    private Task<ChatThreadEntity?> GetOwnedThreadAsync(
        Guid threadId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken
    ) => repository.GetThreadAsync(threadId, context, cancellationToken);
}
