using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Process;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Implemented by a built-in <see cref="IProcessTask"/> that must settle something outside the app before a reject
/// abandons the task.
/// </summary>
/// <remarks>
/// process/next calls it for a reject, after validation and right before the transition, while the instance is still
/// idle. A reject runs no user action, and usually no validation, and <see cref="IProcessTask.Abandon"/> runs in a
/// workflow engine step, where a failing call to an external system would leave the instance stuck. The process engine
/// saves the changes staged on the data mutator before the transition, also when the reject is refused.
/// </remarks>
internal interface IProcessTaskAbandonPreparer
{
    /// <summary>
    /// Prepares the current task for being abandoned.
    /// </summary>
    /// <returns>Null to let the reject go ahead, or the failed result that refuses it.</returns>
    Task<ProcessChangeResult?> PrepareAbandon(
        IInstanceDataMutator dataMutator,
        string taskId,
        CancellationToken cancellationToken
    );
}
