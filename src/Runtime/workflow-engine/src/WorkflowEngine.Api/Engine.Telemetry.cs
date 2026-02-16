using System.Diagnostics;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Api;

internal partial class Engine
{
    private static void StartProcessWorkflowActivityOnce(Workflow workflow)
    {
        // Subsequent iterations: do nothing, activity is already stored on the workflow
        // if (workflow.EngineTraceContext is not null)
        //     return;

        // First iteration: create a new linked root trace for this workflow
        workflow.EngineActivity ??= Metrics.Source.StartLinkedRootActivity(
            $"{Metrics.ActivityPrefix}.ProcessWorkflow",
            kind: ActivityKind.Consumer,
            links: Metrics.ParseSourceContext(workflow.DistributedTraceContext),
            tags: workflow.GetActivityTags()
        );

        // workflow.EngineTraceContext = activity?.Context;
        // workflow.EngineActivity = activity;
    }

    private static void StartProcessStepActivityOnce(Workflow workflow, Step step)
    {
        // Subsequent iterations: do nothing, activity is already stored on the step
        // if (step.EngineTraceContext is not null)
        //     return;

        // First iteration: create a new child activity for this step
        step.EngineActivity ??= Metrics.Source.StartActivity(
            $"{Metrics.ActivityPrefix}.ProcessStep",
            ActivityKind.Consumer,
            workflow.EngineActivity?.Context ?? default,
            step.GetActivityTags()
        );

        // step.EngineTraceContext = activity?.Context;
        // step.EngineActivity = activity;
    }

    /// <summary>
    /// Stops and disposes the stored activity on a <see cref="PersistentItem"/>, finalizing the span duration.
    /// Sets <see cref="Activity.Current"/> to the item's activity before stopping, so the end time is recorded correctly.
    /// </summary>
    private static void StopActivity(PersistentItem item)
    {
        if (item.EngineActivity is null)
            return;

        item.EngineActivity.SetEndTime(DateTime.UtcNow);
        item.EngineActivity.Stop();
        item.EngineActivity.Dispose();
        item.EngineActivity = null;
    }

    private void RecordWorkflowQueueTime(Workflow workflow)
    {
        var queueDuration = workflow.OrderedSteps().First().GetQueueDeltaTime(_timeProvider).TotalSeconds;
        Metrics.WorkflowQueueTime.Record(queueDuration, workflow.GetHistorgramTags());
    }

    private void RecordWorkflowServiceTime(Workflow workflow)
    {
        var serviceDuration = _timeProvider
            .GetUtcNow()
            .Subtract(workflow.ExecutionStartedAt ?? workflow.CreatedAt)
            .TotalSeconds;

        Metrics.WorkflowServiceTime.Record(serviceDuration, workflow.GetHistorgramTags());
    }

    private void RecordWorkflowTotalTime(Workflow workflow)
    {
        var scheduledStart = workflow.StartAt ?? workflow.CreatedAt;
        var totalDuration = _timeProvider.GetUtcNow().Subtract(scheduledStart).TotalSeconds;
        Metrics.WorkflowTotalTime.Record(totalDuration, workflow.GetHistorgramTags());
    }

    private void RecordStepQueueTime(Step step)
    {
        var queueDuration = step.GetQueueDeltaTime(_timeProvider).TotalSeconds;
        Metrics.StepQueueTime.Record(queueDuration, step.GetHistorgramTags());
    }

    private void RecordStepServiceTime(Step step)
    {
        var serviceDuration = _timeProvider
            .GetUtcNow()
            .Subtract(step.ExecutionStartedAt ?? step.CreatedAt)
            .TotalSeconds;

        Metrics.StepServiceTime.Record(serviceDuration, step.GetHistorgramTags());
    }

    private void RecordStepTotalTime(Step currentStep, Step? previousStep)
    {
        var totalDuration = _timeProvider
            .GetUtcNow()
            .Subtract(previousStep?.UpdatedAt ?? currentStep.CreatedAt)
            .TotalSeconds;

        Metrics.StepTotalTime.Record(totalDuration, currentStep.GetHistorgramTags());
    }
}
