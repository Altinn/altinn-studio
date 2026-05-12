using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IChatService
{
    Task<List<ChatThreadEntity>> GetThreadsAsync(
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    );

    Task<ChatThreadEntity> CreateThreadAsync(
        string title,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    );

    Task<ChatThreadEntity?> UpdateThreadAsync(
        Guid threadId,
        UpdateChatThreadRequest request,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    );

    Task DeleteThreadAsync(
        Guid threadId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    );

    Task<int> DeleteInactiveThreadsAsync(CancellationToken cancellationToken = default);

    Task<List<ChatMessageEntity>?> GetMessagesAsync(
        Guid threadId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    );

    Task<ChatMessageEntity?> CreateMessageAsync(
        Guid threadId,
        CreateChatMessageRequest request,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    );

    Task DeleteMessageAsync(
        Guid threadId,
        Guid messageId,
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    );
}
