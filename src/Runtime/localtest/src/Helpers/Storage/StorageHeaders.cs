#nullable enable

namespace Altinn.Platform.Storage.Helpers;

/// <summary>
/// Storage-specific HTTP headers.
/// </summary>
public static class StorageHeaders
{
    /// <summary>
    /// Optional expected aggregate instance version request header.
    /// </summary>
    public const string IfInstanceVersionMatch = "If-Instance-Version-Match";

    /// <summary>
    /// Optional expected process-state version request header.
    /// </summary>
    public const string IfProcessStateVersionMatch = "If-Process-State-Version-Match";

    /// <summary>
    /// Current aggregate instance version response header.
    /// </summary>
    public const string InstanceVersion = "Instance-Version";

    /// <summary>
    /// Current process-state version response header.
    /// </summary>
    public const string ProcessStateVersion = "Process-State-Version";

    /// <summary>
    /// Optional idempotency key for workflow-owned aggregate saves.
    /// </summary>
    public const string IdempotencyKey = "Idempotency-Key";

    /// <summary>
    /// Storage lock token request header.
    /// </summary>
    public const string LockToken = "Altinn-Storage-Lock-Token";
}
