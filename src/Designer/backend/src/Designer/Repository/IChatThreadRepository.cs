using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Repository;

/// <summary>
/// Repository for managing chat threads and messages for the AI Assistant.
/// </summary>
public interface IChatThreadRepository
{
    /// <summary>
    /// Gets all threads without messages for a given user, ordered by newest first.
    /// </summary>
    /// <param name="context">An <see cref="AltinnRepoEditingContext"/>.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    Task<IEnumerable<ChatThreadEntity>> GetThreadsAsync(
        AltinnRepoEditingContext context,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates a new chat thread.
    /// </summary>
    /// <param name="thread">The thread to create.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    /// <returns>The created thread.</returns>
    Task<ChatThreadEntity> CreateThreadAsync(ChatThreadEntity thread, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the title of an existing chat thread.
    /// </summary>
    /// <param name="thread">The thread with updated title.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    Task UpdateThreadAsync(ChatThreadEntity thread, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a chat thread and all its messages.
    /// </summary>
    /// <param name="id">The thread id.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    Task DeleteThreadAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new message in an existing thread.
    /// </summary>
    /// <param name="threadId">The id of the thread.</param>
    /// <param name="message">The message to create.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    /// <returns>The created message with generated id.</returns>
    Task<ChatMessageEntity> CreateMessageAsync(
        Guid threadId,
        ChatMessageEntity message,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets all messages for a given thread, ordered by creation time.
    /// </summary>
    /// <param name="threadId">The thread id.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    Task<IEnumerable<ChatMessageEntity>> GetMessagesAsync(Guid threadId, CancellationToken cancellationToken = default);
}
