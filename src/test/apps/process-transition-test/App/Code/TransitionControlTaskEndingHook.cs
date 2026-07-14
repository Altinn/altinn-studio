#nullable enable
using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Models;
using Altinn.App.Models.TransitionControl;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Code;

/// <summary>
/// Pre-commit lever for the Task_1 → Task_2 transition.
///
/// Runs inside the workflow engine's task-end command group, BEFORE the process state is committed
/// to Storage. While this hook is delaying/failing the committed <c>currentTask</c> is still Task_1
/// and the engine surfaces the transition as <c>processing</c> (delay / retryable) or <c>failed</c>
/// (permanent), so the frontend's live workflow-status state machine is exercised.
/// </summary>
public sealed class TransitionControlTaskEndingHook : IOnTaskEndingHandler
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

        string? phase = levers.phase;
        if (phase != "taskEnding")
        {
            return HookResult.Success();
        }

        int delayMs = levers.delayMs ?? 0;
        int failCount = levers.failCount ?? 0;
        string? failKind = levers.failKind;

        if (delayMs > 0)
        {
            await Task.Delay(delayMs, context.CancellationToken);
        }

        Guid instanceGuid = Guid.Parse(instance.Id.Split('/').Last());
        int attempt = AttemptTracker.Next(instanceGuid, "taskEnding");
        if (attempt <= failCount)
        {
            string message =
                $"TransitionControl forced a taskEnding failure (attempt {attempt} of {failCount}, kind '{failKind}').";
            return failKind == "permanent"
                ? HookResult.FailedPermanent(message)
                : HookResult.FailedRetryable(message);
        }

        AttemptTracker.Reset(instanceGuid, "taskEnding");
        return HookResult.Success();
    }
}
