#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Models;
using Altinn.App.Models.TransitionControl;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Logic;

/// <summary>
/// Post-commit lever for the forward transition (<c>path == "postCommit"</c>), implemented as a
/// pipeline service task with one stage: <c>PrepareScenario</c> completes first, then the
/// <c>Finally</c> (<c>RunScenario</c>) reads the TransitionControl levers and runs the scenario.
/// The stage's completion is recorded durably, so every retry, deferral re-check and resume
/// re-runs only <c>RunScenario</c> — every postCommit e2e scenario thereby drives the multi-stage
/// contract (expansion, dispatch by stage index, per-stage durability) through the public API.
///
/// The <c>Gateway_PostCommit</c> gateway routes through <c>Task_Service</c> only on this path.
/// That transition COMMITS first; the engine then runs the task as critical post-commit steps, so
/// a delay or transient failure surfaces as workflow-status <c>processing</c> on the committed
/// task and a permanent failure as terminal <c>failed</c> — the two states the workflow-status
/// e2e drives. On success the task auto-advances to Task_2.
///
/// Scenario shape: run <c>attempts</c> times with <c>delayMs</c> injected on each; every attempt
/// but the last fails retryably, and the last settles on <c>endState</c> — <c>success</c>,
/// <c>failure</c> (every replay fails the same way), or <c>failureThenSuccess</c> (permanent
/// failure once, then success on the resume-driven replay — the "Prøv igjen" recovery lever).
/// A successful settle honours <c>advance: "park"</c>: succeed WITHOUT auto-advancing, leaving
/// the process on the service task (the frontend's implicit waiting step, #18935) until an
/// out-of-band process/next releases it. Both service tasks (Task_Service and its layouted twin
/// Task_ServiceLayout, via <c>serviceView</c>) run this same scenario.
/// </summary>
public sealed class ScenarioServiceTask : IPipelineServiceTask
{
    private readonly ParkedTaskReleaser _parkedTaskReleaser;

    public ScenarioServiceTask(ParkedTaskReleaser parkedTaskReleaser)
    {
        _parkedTaskReleaser = parkedTaskReleaser;
    }

    public string Type => "scenario";

    /// <summary>
    /// A deliberately tiny wait budget so the <c>waitExpired</c> scenario can expire inside a test
    /// run (production budgets are hours or days). Only deferrals spend it, so other scenarios
    /// are unaffected.
    /// </summary>
    internal static readonly TimeSpan ScenarioWaitBudget = TimeSpan.FromSeconds(30);

    public ProcessStepOptions? StepOptions => new() { WaitBudget = ScenarioWaitBudget };

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline.Stage(PrepareScenario).Finally(RunScenario);

    /// <summary>
    /// No scenario work of its own — it exists so every postCommit e2e scenario runs a real
    /// multi-stage pipeline: this stage completes exactly once per pass, and retries/resumes
    /// re-enter at <c>RunScenario</c> without re-running it.
    /// </summary>
    private Task<ServiceTaskStageResult> PrepareScenario(ServiceTaskContext context) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private async Task<ServiceTaskResult> RunScenario(ServiceTaskContext context)
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
        int deferrals = levers.deferrals ?? 0;
        var deferDelay = TimeSpan.FromMilliseconds(levers.deferDelayMs ?? 2000);

        // Don't start work this attempt cannot finish: the engine abandons it at ExecutionDeadline and
        // records a retryable failure, whereas deferring hands the next attempt a full budget. Inert
        // under the default 10-minute timeout — it demonstrates the pattern a real slow-system call wants.
        if (delayMs > 0 && context.Attempt.Deadline is { } executionDeadline)
        {
            var remaining = executionDeadline - DateTimeOffset.UtcNow;
            if (remaining < TimeSpan.FromMilliseconds(delayMs))
            {
                return ServiceTaskResult.Defer(
                    deferDelay,
                    $"only {remaining.TotalSeconds:F1}s left of this attempt, need {delayMs}ms — retrying with a fresh budget"
                );
            }
        }

        if (delayMs > 0)
        {
            await Task.Delay(delayMs, context.CancellationToken);
        }

        // Reads context.Wait.DeferCount rather than the AttemptTracker: the engine counts deferrals durably,
        // and mixing them into the attempt counter would conflate "not ready" with "failed, retrying".
        if (levers.endState == "waitExpired")
        {
            // Never settles. The engine keeps re-running this step until ScenarioWaitBudget is spent,
            // then fails the step with wait_expired — a failure nobody's code caused.
            return ServiceTaskResult.Defer(
                deferDelay,
                $"waitExpired scenario: outcome will never arrive (check {context.Wait.DeferCount + 1})"
            );
        }

        if (context.Wait.DeferCount < deferrals)
        {
            return ServiceTaskResult.Defer(
                deferDelay,
                $"TransitionControl forced a deferral ({context.Wait.DeferCount + 1} of {deferrals})"
            );
        }

        Guid instanceGuid = Guid.Parse(instance.Id.Split('/').Last());
        int attempt = AttemptTracker.Next(instanceGuid, "postCommit");
        if (attempt < attempts)
        {
            // Not the last attempt yet: fail retryably so the engine re-invokes this step (and
            // only this step — PrepareScenario is complete and stays complete).
            return ServiceTaskResult.FailedRetryable(
                $"TransitionControl forced a transient postCommit failure (attempt {attempt} of {attempts})."
            );
        }

        // First settling attempt with "failureThenSuccess": fail permanently but KEEP the attempt
        // counter, so the resume-driven replay (the failed task view's "Prøv igjen" →
        // process/resume re-running this step) arrives here as attempt attempts+1 and falls
        // through to the success below.
        if (levers.endState == "failureThenSuccess" && attempt == attempts)
        {
            return ServiceTaskResult.FailedPermanent(
                $"TransitionControl forced a terminal postCommit failure after {attempts} attempt{(attempts == 1 ? "" : "s")} (recoverable: the next replay succeeds)."
            );
        }

        // Settled: reset so replaying the scenario (e.g. after navigating back from Task_2) starts
        // again from attempt 1. "failure" resets too — every replay fails the same way.
        AttemptTracker.Reset(instanceGuid, "postCommit");
        if (levers.endState == "failure")
        {
            return ServiceTaskResult.FailedPermanent(
                $"TransitionControl forced a terminal postCommit failure after {attempts} attempt{(attempts == 1 ? "" : "s")}."
            );
        }

        // "park" / "parkThenRelease": succeed WITHOUT auto-advancing — the process stays parked
        // on the service task (the frontend's implicit waiting step) until an out-of-band
        // process/next releases it, simulating a task that waits for an external callback.
        // "parkThenRelease" additionally schedules that release itself (~5s), imitating the
        // external system's callback arriving on its own.
        if (levers.advance is "park" or "parkThenRelease")
        {
            if (levers.advance == "parkThenRelease")
            {
                _parkedTaskReleaser.ScheduleRelease(instance.Org, instance.AppId, instance.Id);
            }
            return ServiceTaskResult.SuccessWithoutAutoAdvance();
        }

        return ServiceTaskResult.Success();
    }
}
