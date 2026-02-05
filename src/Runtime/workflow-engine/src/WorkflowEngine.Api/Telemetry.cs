using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace WorkflowEngine.Api;

internal static class Telemetry
{
    public const string ServiceName = "WorkflowEngine";
    public const string ServiceVersion = "1.0.0"; // TODO: Get this from build
    public static readonly ActivitySource Source = new(ServiceName);
    public static readonly Meter Meter = new(ServiceName);

    public static readonly Counter<long> Errors = Meter.CreateCounter<long>("engine.errors");
    public static readonly Counter<long> WorkflowQueriesReceived = Meter.CreateCounter<long>(
        "engine.workflows.query.received"
    );
    public static readonly Counter<long> WorkflowRequestsReceived = Meter.CreateCounter<long>(
        "engine.workflows.request.received"
    );
    public static readonly Counter<long> WorkflowRequestsAccepted = Meter.CreateCounter<long>(
        "engine.workflows.request.accepted"
    );
    public static readonly Counter<long> WorkflowsSucceeded = Meter.CreateCounter<long>(
        "engine.workflows.execution.success"
    );
    public static readonly Counter<long> WorkflowsFailed = Meter.CreateCounter<long>(
        "engine.workflows.execution.failed"
    );
    public static readonly Histogram<double> WorkflowQueueTime = Meter.CreateHistogram<double>(
        "engine.workflows.time.queue",
        "s",
        "Amount of time a workflow spent in the queue before and between executions (seconds)"
    );
    public static readonly Histogram<double> WorkflowServiceTime = Meter.CreateHistogram<double>(
        "engine.workflows.time.service",
        "s",
        "Amount of time a workflow's steps spent being actively executed (seconds). Includes time spent on database IO."
    );
    public static readonly Histogram<double> WorkflowTotalTime = Meter.CreateHistogram<double>(
        "engine.workflows.time.total",
        "s",
        "Amount of time a workflow spent in the engine, start to finish (seconds). Includes time spend on the queue due to retries."
    );

    public static readonly Counter<long> StepRequestsAccepted = Meter.CreateCounter<long>(
        "engine.steps.request.accepted"
    );
    public static readonly Counter<long> StepsSucceeded = Meter.CreateCounter<long>("engine.step.executions.success");
    public static readonly Counter<long> StepsRequeued = Meter.CreateCounter<long>("engine.step.executions.requeued");
    public static readonly Counter<long> StepsFailed = Meter.CreateCounter<long>("engine.step.executions.failed");

    public static readonly Histogram<double> StepQueueTime = Meter.CreateHistogram<double>(
        "engine.steps.time.queue",
        "s",
        "Amount of time a step spent in the queue before being picked up by a worker (seconds)"
    );
    public static readonly Histogram<double> StepServiceTime = Meter.CreateHistogram<double>(
        "engine.steps.time.service",
        "s",
        "Amount of time a step spent being actively executed (seconds). Includes time spent on database IO."
    );
    public static readonly Histogram<double> StepTotalTime = Meter.CreateHistogram<double>(
        "engine.steps.time.total",
        "s",
        "Amount of time a step spent in the engine, start to finish (seconds). Includes time spend on the queue due to retries."
    );

    private static long _activeWorkflowsCount;
    public static readonly ObservableGauge<long> ActiveWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.active",
        static () => _activeWorkflowsCount
    );

    private static long _scheduledWorkflowsCount;
    public static readonly ObservableGauge<long> ScheduledWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.scheduled",
        static () => _scheduledWorkflowsCount
    );

    private static long _failedWorkflowsCount;
    public static readonly ObservableGauge<long> FailedWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.failed",
        static () => _failedWorkflowsCount
    );

    public static void SetActiveWorkflowsCount(long count) => _activeWorkflowsCount = count;

    public static void SetScheduledWorkflowsCount(long count) => _scheduledWorkflowsCount = count;

    public static void SetFailedWorkflowsCount(long count) => _failedWorkflowsCount = count;

    public static IEnumerable<ActivityLink>? ParseSourceContext(string? traceContext)
    {
        if (traceContext is not null && ActivityContext.TryParse(traceContext, null, out var context))
        {
            return [new ActivityLink(context)];
        }

        return null;
    }
}
