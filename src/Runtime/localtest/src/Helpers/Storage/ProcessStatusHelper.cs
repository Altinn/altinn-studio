#nullable disable

using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

namespace Altinn.Platform.Storage.Helpers;

/// <summary>
/// Shared process-status rules for Storage write admission.
/// </summary>
internal static class ProcessStatusHelper
{
    /// <summary>
    /// Ensures that a caller's expected process status matches the loaded instance.
    /// </summary>
    /// <param name="instance">The instance used to authorize the write.</param>
    /// <param name="expectedProcessStatus">
    /// The caller's expected status. An absent value means <see cref="ProcessStatus.Idle"/>.
    /// </param>
    /// <exception cref="ProcessStatusConflictException">
    /// Thrown when the expected and current statuses differ.
    /// </exception>
    public static void EnsureExpectedStatus(
        Instance instance,
        ProcessStatus? expectedProcessStatus = null
    )
    {
        ProcessStatus currentProcessStatus = instance.Process?.Status ?? ProcessStatus.Idle;
        expectedProcessStatus ??= ProcessStatus.Idle;

        if (currentProcessStatus != expectedProcessStatus)
        {
            throw new ProcessStatusConflictException(currentProcessStatus);
        }
    }
}
