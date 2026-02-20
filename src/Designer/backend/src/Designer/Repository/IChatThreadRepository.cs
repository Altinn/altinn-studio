using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Repository;

/// <summary>
/// Repository for managing chat threads, messages, and attachments for the AI Assistant.
/// </summary>
public interface IChatThreadRepository
{
    /// <summary>
    /// Gets a chat thread by id, including its messages and attachments.
    /// </summary>
    /// <param name="id">The thread id.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    /// <returns>The thread, or null if not found.</returns>
    Task<ChatThreadEntity?> GetThreadAsync(long id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets thread titles for a given org, app, and user, ordered by newest first.
    /// </summary>
    /// <param name="context">An <see cref="AltinnRepoEditingContext"/>.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    Task<IEnumerable<ChatThreadTitle>> GetThreadTitlesAsync(AltinnRepoEditingContext context, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new chat thread.
    /// </summary>
    /// <param name="thread">The thread to create.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    /// <returns>The created thread with generated id.</returns>
    Task<ChatThreadEntity> CreateThreadAsync(ChatThreadEntity thread, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the title of an existing chat thread.
    /// </summary>
    /// <param name="thread">The thread with updated title.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    Task UpdateThreadAsync(ChatThreadEntity thread, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a chat thread and all its messages and attachments.
    /// </summary>
    /// <param name="id">The thread id.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    Task DeleteThreadAsync(long id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new message in an existing thread.
    /// </summary>
    /// <param name="message">The message to create.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    /// <returns>The created message with generated id.</returns>
    Task<ChatMessageEntity> CreateMessageAsync(ChatMessageEntity message, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new attachment for an existing message.
    /// </summary>
    /// <param name="attachment">The attachment to create.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    /// <returns>The created attachment with generated id.</returns>
    Task<ChatAttachmentEntity> CreateAttachmentAsync(ChatAttachmentEntity attachment, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes an attachment by id.
    /// </summary>
    /// <param name="id">The attachment id.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/>.</param>
    Task DeleteAttachmentAsync(long id, CancellationToken cancellationToken = default);
}
