#nullable disable

namespace Altinn.Platform.Storage.Repository;

/// <summary>
/// Storage-level options and preconditions for data element metadata updates.
/// </summary>
public sealed class DataElementUpdateContext
{
    /// <summary>
    /// Expected current blob version that must match before the metadata update is applied.
    /// </summary>
    public string ExpectedCurrentBlobVersion { get; init; }

    /// <summary>
    /// Whether the update should be rejected when the data element is locked or hard-deleted.
    /// </summary>
    public bool EnforceLockCheck { get; init; }

    /// <summary>
    /// Expected parent instance version.
    /// </summary>
    public int? ExpectedInstanceVersion { get; init; }

    /// <summary>
    /// Expected parent process-state version.
    /// </summary>
    public int? ExpectedProcessStateVersion { get; init; }
}
