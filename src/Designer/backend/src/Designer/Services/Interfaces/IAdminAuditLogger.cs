using System;
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

    /// <summary>
    /// Durably records that the authenticated user asked the workflow engine to act on a workflow
    /// of an instance, before the request is sent. <paramref name="action"/> is one of the workflow
    /// actions in <c>AdminAuditActions</c>. Returns the id of the audit log entry.
    /// </summary>
    Task<long> LogWorkflowActionRequestedAsync(
        string org,
        string env,
        string app,
        string instanceId,
        Guid workflowId,
        string action,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Marks a previously recorded workflow action as completed: the engine accepted it.
    /// </summary>
    Task LogWorkflowActionCompletedAsync(long entryId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Marks a previously recorded workflow action as failed: the engine or the gateway refused it.
    /// </summary>
    Task LogWorkflowActionFailedAsync(long entryId, CancellationToken cancellationToken = default);
}
