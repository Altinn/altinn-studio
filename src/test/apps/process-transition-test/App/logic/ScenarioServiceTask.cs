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
/// Post-commit lever for the forward transition (<c>path == "postCommit"</c>).
///
/// The <c>Gateway_PostCommit</c> gateway after Task_1 routes through the <c>Task_Service</c>
/// service task only when the path lever is "postCommit". That transition COMMITS first
/// (committed = Task_Service); the engine then runs <c>ExecuteServiceTask</c> as a critical
/// post-commit step in the same Main workflow, which invokes this hook. A delay or transient
/// failure here is therefore surfaced by the live workflow-status as <c>processing</c> on the
/// committed Task_Service, and a permanent failure as the terminal <c>failed</c> state — the two
/// post-commit states the workflow-status e2e drives. On success the service task auto-advances
/// to Task_2, so the user experience stays "Task 1 → (behandling) → Task 2".
///
/// Scenario shape: run <c>attempts</c> times with <c>delayMs</c> injected on each; every attempt
/// but the last fails retryably (the engine auto-retries), and the last settles on
/// <c>endState</c> — either <c>success</c> (auto-advance to Task_2) or <c>failure</c> (permanent
/// failure → error page). Unlike the retired IEventsClient hack, a permanent service-task failure
/// is a REAL terminal failure — no workflow-cancellation cheat needed.
/// </summary>
public sealed class ScenarioServiceTask : IServiceTask
{
    public string Type => "scenario";

    public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        Instance instance = context.InstanceDataMutator.Instance;
        DataElement? dataElement = instance.Data.Find(x => x.DataType == "TransitionControl");
        if (dataElement is null)
        {
            return ServiceTaskResult.Success();
        }

        var levers = (TransitionControl)
            await context.InstanceDataMutator.GetFormData(new DataElementIdentifier(dataElement));

        // The gateway only routes here when path == "postCommit", but stay defensive: any other
        // value means there is no scenario to run.
        if (levers.path != "postCommit")
        {
            return ServiceTaskResult.Success();
        }

        int delayMs = levers.delayMs ?? 0;
        int attempts = levers.attempts ?? 1;
        bool endInFailure = levers.endState == "failure";

        if (delayMs > 0)
        {
            await Task.Delay(delayMs, context.CancellationToken);
        }

        Guid instanceGuid = Guid.Parse(instance.Id.Split('/').Last());
        int attempt = AttemptTracker.Next(instanceGuid, "postCommit");
        if (attempt < attempts)
        {
            // Not the last attempt yet: fail retryably so the engine re-invokes this hook.
            return ServiceTaskResult.FailedRetryable(
                $"TransitionControl forced a transient postCommit failure (attempt {attempt} of {attempts})."
            );
        }

        // Last attempt: settle on the configured end state. Reset first so replaying the scenario
        // (e.g. after navigating back from Task_2) starts again from attempt 1.
        AttemptTracker.Reset(instanceGuid, "postCommit");
        return endInFailure
            ? ServiceTaskResult.FailedPermanent(
                $"TransitionControl forced a terminal postCommit failure after {attempts} attempt{(attempts == 1 ? "" : "s")}."
            )
            : ServiceTaskResult.Success();
    }
}
