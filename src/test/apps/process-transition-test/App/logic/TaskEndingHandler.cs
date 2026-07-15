#nullable enable
using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Models;
using Altinn.App.Models.TransitionControl;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Logic;

/// <summary>
/// Pre-commit lever for the Task_1 → Task_2 transition (<c>path == "preCommit"</c>).
///
/// Runs inside the workflow engine's task-end command group, BEFORE the process state is committed
/// to Storage. While this hook is delaying/failing the committed <c>currentTask</c> is still Task_1
/// and the engine surfaces the transition as <c>processing</c> (delay / transient retries) or
/// <c>failed</c> (terminal), so the frontend's live workflow-status state machine is exercised.
///
/// Scenario shape: run <c>attempts</c> times with <c>delayMs</c> injected on each; every attempt but
/// the last fails retryably (the engine auto-retries), and the last settles on <c>endState</c> —
/// either <c>success</c> (transition completes) or <c>failure</c> (permanent failure → error page).
/// </summary>
public sealed class TaskEndingHandler : IOnTaskEndingHandler
{
    public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

    public async Task<HookResult> Execute(OnTaskEndingContext context)
    {
        Instance instance = context.InstanceDataMutator.Instance;
        DataElement? dataElement = instance.Data.Find(x => x.DataType == "TransitionControl");
        if (dataElement is null)
        {
            return HookResult.Success();
        }

        var levers = (TransitionControl)
            await context.InstanceDataMutator.GetFormData(new DataElementIdentifier(dataElement));

        if (levers.path != "preCommit")
        {
            return HookResult.Success();
        }

        int delayMs = levers.delayMs ?? 0;
        int attempts = levers.attempts ?? 1;
        bool endInFailure = levers.endState == "failure";

        if (delayMs > 0)
        {
            await Task.Delay(delayMs, context.CancellationToken);
        }

        Guid instanceGuid = Guid.Parse(instance.Id.Split('/').Last());
        int attempt = AttemptTracker.Next(instanceGuid, "preCommit");
        if (attempt < attempts)
        {
            // Not the last attempt yet: fail retryably so the engine re-invokes this hook.
            return HookResult.FailedRetryable(
                $"TransitionControl forced a transient preCommit failure (attempt {attempt} of {attempts})."
            );
        }

        // Last attempt: settle on the configured end state. Reset first so replaying the scenario
        // (e.g. after navigating back from Task_2) starts again from attempt 1.
        AttemptTracker.Reset(instanceGuid, "preCommit");
        return endInFailure
            ? HookResult.FailedPermanent(
                $"TransitionControl forced a terminal preCommit failure after {attempts} attempt{(attempts == 1 ? "" : "s")}."
            )
            : HookResult.Success();
    }
}
