#nullable disable
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Repository;

public interface IChatThreadRepository
{
    Task<ChatThreadEntity> GetThreadAsync(long id, CancellationToken cancellationToken = default);

    Task<IEnumerable<ChatThreadTitle>> GetThreadTitlesAsync(string org, string app, string createdBy, CancellationToken cancellationToken = default);

    Task<ChatThreadEntity> CreateThreadAsync(ChatThreadEntity thread, CancellationToken cancellationToken = default);

    Task UpdateThreadAsync(ChatThreadEntity thread, CancellationToken cancellationToken = default);

    Task DeleteThreadAsync(long id, CancellationToken cancellationToken = default);

    Task<ChatMessageEntity> CreateMessageAsync(ChatMessageEntity message, CancellationToken cancellationToken = default);

    Task<ChatAttachmentEntity> CreateAttachmentAsync(ChatAttachmentEntity attachment, CancellationToken cancellationToken = default);

    Task DeleteAttachmentAsync(long id, CancellationToken cancellationToken = default);
}
