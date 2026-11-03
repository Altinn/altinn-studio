using System.Collections.Generic;

namespace Altinn.Studio.Designer.TypedHttpClients.Operator.Models;

/// <summary>
/// A kind of run from the operator's catalog that the caller may start.
/// </summary>
/// <param name="Name">The name to create a run with, such as <c>upgrade-v9</c>.</param>
/// <param name="QueueTimeoutSeconds">How long a run may wait in the queue before it expires.</param>
/// <param name="UploadTimeoutSeconds">
/// How long a run waits for its archive once its status is <see cref="RunStatus.AwaitingArchive"/>. Then it fails.
/// </param>
/// <param name="RunTimeoutSeconds">How long the command may run once it has started.</param>
/// <param name="ResultTimeoutSeconds">
/// How long the result can be fetched after the run has ended. Then the operator deletes the Job, and the result with
/// it.
/// </param>
/// <param name="MaxDurationSeconds">
/// The longest time from the create of a run until the operator gives it a final status. A caller that has seen no
/// final status by then can give up on the run.
/// </param>
/// <param name="Args">The names of the arguments the kind accepts.</param>
internal sealed record Kind(
    string Name,
    int QueueTimeoutSeconds,
    int UploadTimeoutSeconds,
    int RunTimeoutSeconds,
    int ResultTimeoutSeconds,
    int MaxDurationSeconds,
    IReadOnlyList<string> Args
);
