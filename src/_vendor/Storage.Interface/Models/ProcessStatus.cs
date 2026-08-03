#nullable disable

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Storage-controlled process status values.
/// </summary>
public static class ProcessStatus
{
    /// <summary>
    /// The instance process is available for user-facing mutations.
    /// </summary>
    public const string Idle = "idle";

    /// <summary>
    /// The instance process is owned by an active workflow transition.
    /// </summary>
    public const string Processing = "processing";
}
