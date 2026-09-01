using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAdminAuditLogger
{
    /// <summary>
    /// Durably records that the authenticated user requested deletion of an instance,
    /// before the deletion is carried out. Returns the id of the audit log entry.
    /// </summary>
    Task<long> LogInstanceDeletionRequestedAsync(
        string org,
        string env,
        string app,
        string instanceId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Marks a previously recorded deletion request as completed.
    /// </summary>
    Task LogInstanceDeletionCompletedAsync(long entryId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Marks a previously recorded deletion request as failed.
    /// </summary>
    Task LogInstanceDeletionFailedAsync(long entryId, CancellationToken cancellationToken = default);
}
