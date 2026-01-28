#nullable enable

using Altinn.Platform.Storage.Models;

namespace Altinn.Platform.Storage.Repository;

/// <summary>
/// The repository to handle instance locks
/// </summary>
public interface IInstanceLockRepository
{
    /// <summary>
    /// Attempts to acquire a lock for an instance.
    /// </summary>
    /// <param name="instanceInternalId">The instance internal ID</param>
    /// <param name="ttlSeconds">Lock time to live in seconds</param>
    /// <param name="userId">The ID of the user acquiring the lock</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>A tuple containing the result of the operation and the lock token if successful.</returns>
    Task<(AcquireLockResult Result, LockToken? lockToken)> TryAcquireLock(
        Guid instanceGuid,
        int ttlSeconds,
        string userId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Tries to update the expiration of an existing lock. Fails if the lock doesn't exist, is no longer active, or the secret doesn't match.
    /// </summary>
    /// <param name="lockToken">The lock token</param>
    /// <param name="instanceInternalId">The instance internal ID</param>
    /// <param name="ttlSeconds">New time to live in seconds</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The result of the operation.</returns>
    Task<UpdateLockResult> TryUpdateLockExpiration(
        LockToken lockToken,
        Guid instanceGuid,
        int ttlSeconds,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the details of a lock
    /// </summary>
    /// <param name="lockId">The lock ID</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The lock details if they exist, null otherwise</returns>
    Task<InstanceLock?> Get(long lockId, CancellationToken cancellationToken = default);
}
