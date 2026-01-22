using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace WorkflowEngine.Api.Constants;

internal static class Telemetry
{
    public const string ServiceName = "WorkflowEngine";
    public const string ServiceVersion = "1.0.0"; // TODO: Get this from build
    public static readonly ActivitySource Source = new(ServiceName);
    public static readonly Meter Meter = new(ServiceName);

    // public static readonly Counter<long> InstancesPolled = Meter.CreateCounter<long>("mottak.instances.polled");
    // public static readonly Counter<long> InstancesInserted = Meter.CreateCounter<long>("mottak.instances.inserted");
    // public static readonly Counter<long> InstancesDispatched = Meter.CreateCounter<long>("mottak.instances.dispatched");
    // public static readonly Counter<long> CommandsExecuted = Meter.CreateCounter<long>("mottak.commands.executed");
    // public static readonly Counter<long> Errors = Meter.CreateCounter<long>("mottak.errors");
    // public static readonly Counter<long> MaintenanceJobsExecuted = Meter.CreateCounter<long>(
    //     "mottak.maintenance.jobs_executed"
    // );
    //
    // public static readonly Histogram<double> ArchivalToPublishedDuration = Meter.CreateHistogram<double>(
    //     "mottak.instance.archival_to_published.duration",
    //     "s"
    // );
    // public static readonly Histogram<double> ArchivalToCompletedDuration = Meter.CreateHistogram<double>(
    //     "mottak.instance.archival_to_completed.duration",
    //     "s"
    // );

    private static long _activeWorkflowsCount;
    public static readonly ObservableGauge<long> ActiveWorkflows = Meter.CreateObservableGauge(
        "workflow-engine.workflows.active",
        static () => _activeWorkflowsCount
    );

    private static long _scheduledWorkflowsCount;
    public static readonly ObservableGauge<long> ScheduledWorkflows = Meter.CreateObservableGauge(
        "workflow-engine.workflows.scheduled",
        static () => _scheduledWorkflowsCount
    );

    private static long _failedWorkflowsCount;
    public static readonly ObservableGauge<long> FailedWorkflows = Meter.CreateObservableGauge(
        "workflow-engine.workflows.failed",
        static () => _failedWorkflowsCount
    );

    public static void SetActiveWorkflowsCount(long count) => _activeWorkflowsCount = count;

    public static void SetScheduledWorkflowsCount(long count) => _scheduledWorkflowsCount = count;

    public static void SetFailedWorkflowsCount(long count) => _failedWorkflowsCount = count;
}
