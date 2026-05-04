namespace Altinn.Platform.Storage.Repository;

/// <summary>
/// Result of attempting to acquire an instance lock.
/// </summary>
public enum AcquireLockResult
{
    /// <summary>
    /// Lock was successfully acquired.
    /// </summary>
    Success,

    /// <summary>
    /// Lock could not be acquired because an active lock already exists for the instance.
    /// </summary>
    LockAlreadyHeld,
}

/// <summary>
/// Result of attempting to update an instance lock expiration.
/// </summary>
public enum UpdateLockResult
{
    /// <summary>
    /// Lock expiration was successfully updated.
    /// </summary>
    Success,

    /// <summary>
    /// Lock was not found.
    /// </summary>
    LockNotFound,

    /// <summary>
    /// Lock exists but has already expired.
    /// </summary>
    LockExpired,

    /// <summary>
    /// The provided lock token does not match the stored token hash.
    /// </summary>
    TokenMismatch,
}
