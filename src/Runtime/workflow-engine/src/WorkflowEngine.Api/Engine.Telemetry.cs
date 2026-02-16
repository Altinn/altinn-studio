using System.Diagnostics;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Api;

internal partial class Engine
{
    private static Activity? StartProcessWorkflowActivityOnce(Workflow workflow)
    {
        // Subsequent iterations: return nothing, don't start another activity
        // Downstream callers will manually set parentContext
        if (workflow.EngineTraceContext is not null)
            return null;

        // First iteration: create a new linked root trace for this workflow
        var activity = Metrics.Source.StartLinkedRootActivity(
            $"{Metrics.ActivityPrefix}.ProcessWorkflow",
            kind: ActivityKind.Consumer,
            links: Metrics.ParseSourceContext(workflow.DistributedTraceContext),
            tags: workflow.GetActivityTags()
        );

        workflow.EngineTraceContext = activity?.Context;

        return activity;
    }

    private static Activity? StartProcessStepActivityOnce(Workflow workflow, Step step)
    {
        // Subsequent iterations: return nothing, don't start another activity
        // Downstream callers will manually set parentContext
        if (step.EngineTraceContext is not null)
            return null;

        // First iteration: create a new linked root trace for this workflow
        var activity = Metrics.Source.StartActivity(
            $"{Metrics.ActivityPrefix}.ProcessStep",
            ActivityKind.Consumer,
            workflow.EngineTraceContext ?? default,
            step.GetActivityTags()
        );

        step.EngineTraceContext = activity?.Context;

        return activity;
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
