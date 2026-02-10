using System.Diagnostics;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Api;

internal partial class Engine
{
    private static Activity? StartProcessWorkflowActivity(Workflow workflow)
    {
        var tags = workflow.GetActivityTags();

        // Subsequent iterations: child of the original ProcessWorkflow span
        if (workflow.EngineTraceContext is { } existingContext)
        {
            return Telemetry.Source.StartActivity(
                "Engine.ProcessWorkflow",
                ActivityKind.Internal,
                parentContext: existingContext,
                tags: tags
            );
        }

        // First iteration: create a new linked root trace for this workflow
        var activity = Telemetry.Source.StartLinkedRootActivity(
            "Engine.ProcessWorkflow",
            kind: ActivityKind.Consumer,
            links: Telemetry.ParseSourceContext(workflow.DistributedTraceContext),
            tags: tags
        );

        workflow.EngineTraceContext = activity?.Context;

        return activity;
    }

    private static Activity? StartProcessStepActivity(Workflow workflow, Step step)
    {
        var tags = step.GetActivityTags();

        // Subsequent iterations: child of the original ProcessSteps span
        if (step.EngineTraceContext is { } existingContext)
        {
            return Telemetry.Source.StartActivity(
                "Engine.ProcessStep",
                ActivityKind.Internal,
                parentContext: existingContext,
                tags: tags
            );
        }

        // First iteration: create a new linked root trace for this workflow
        var activity = Telemetry.Source.StartActivity(
            "Engine.ProcessStep",
            ActivityKind.Consumer,
            workflow.EngineTraceContext ?? default,
            tags
        );

        step.EngineTraceContext = activity?.Context;

        return activity;
    }

    private void RecordWorkflowQueueTime(Workflow workflow)
    {
        var queueDuration = workflow.OrderedSteps().First().GetQueueDeltaTime(_timeProvider).TotalSeconds;
        Telemetry.WorkflowQueueTime.Record(queueDuration, workflow.GetHistorgramTags());
    }

    private void RecordWorkflowServiceTime(Workflow workflow)
    {
        var serviceDuration = _timeProvider
            .GetUtcNow()
            .Subtract(workflow.ExecutionStartedAt ?? workflow.CreatedAt)
            .TotalSeconds;

        Telemetry.WorkflowServiceTime.Record(serviceDuration, workflow.GetHistorgramTags());
    }

    private void RecordWorkflowTotalTime(Workflow workflow)
    {
        var scheduledStart = workflow.OrderedSteps().First().GetActualStartTime();
        var totalDuration = _timeProvider.GetUtcNow().Subtract(scheduledStart).TotalSeconds;
        Telemetry.WorkflowTotalTime.Record(totalDuration, workflow.GetHistorgramTags());
    }

    private void RecordStepQueueTime(Step step)
    {
        var queueDuration = step.GetQueueDeltaTime(_timeProvider).TotalSeconds;
        Telemetry.StepQueueTime.Record(queueDuration, step.GetHistorgramTags());
    }

    private void RecordStepServiceTime(Step step)
    {
        var serviceDuration = _timeProvider
            .GetUtcNow()
            .Subtract(step.ExecutionStartedAt ?? step.CreatedAt)
            .TotalSeconds;

        Telemetry.StepServiceTime.Record(serviceDuration, step.GetHistorgramTags());
    }

    private void RecordStepTotalTime(Step currentStep, Step? previousStep)
    {
        var totalDuration = _timeProvider
            .GetUtcNow()
            .Subtract(previousStep?.UpdatedAt ?? currentStep.CreatedAt)
            .TotalSeconds;

        Telemetry.StepTotalTime.Record(totalDuration, currentStep.GetHistorgramTags());
    }
}
