using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace WorkflowEngine.Api;

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

    // Counters:
    // Requests
    // Successes
    // Failures
    // Total?

    // Histogrammer:
    // QueueTime - Hvor lenge jobben ligger på kø før den blir plukket opp. Hva skjer med retry?
    // ServiceTime - Hvor lenge jobben tar å bli utført
    // TotalTime - Totalt tid fra start til slutt

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

    public static IEnumerable<ActivityLink>? ParseSourceContext(string? traceContext)
    {
        if (traceContext is not null && ActivityContext.TryParse(traceContext, null, out var context))
        {
            return [new ActivityLink(context)];
        }

        return null;
    }
}

internal static class TelemetryExtensions
{
    extension(ActivitySource source)
    {
        /// <summary>
        /// Starts a new activity with the specified name and optional kind, links and tags.
        /// </summary>
        /// <remarks>
        /// To create links from a stored trace context, see <see cref="Telemetry.ParseSourceContext"/> method.
        /// </remarks>
        public Activity? StartActivity(
            string name,
            ActivityKind? kind = null,
            IEnumerable<ActivityLink>? links = null,
            IEnumerable<(string tag, object? value)>? tags = null
        ) =>
            source.StartActivity(
                name,
                kind ?? ActivityKind.Internal,
                parentContext: default,
                links: links,
                tags: tags?.Select(t => new KeyValuePair<string, object?>(t.tag, t.value))
            );

        /// <summary>
        /// Starts a new root activity with the specified name and optional kind and tags.
        /// If an activity context is available, the new activity will be linked to it (but it will not be a child of it).
        /// </summary>
        public Activity? StartLinkedRootActivity(
            string name,
            ActivityKind? kind = null,
            IEnumerable<ActivityLink>? additionalLinks = null,
            IEnumerable<(string tag, object? value)>? tags = null
        )
        {
            var callerContext = Activity.Current?.Context;

            var links = new List<ActivityLink>(additionalLinks ?? []);
            if (callerContext.HasValue)
            {
                links.Add(new ActivityLink(callerContext.Value));
            }

            var rootContext = new ActivityContext(
                traceId: ActivityTraceId.CreateRandom(),
                spanId: default,
                traceFlags: default
            );

            return source.StartActivity(
                name,
                kind: kind ?? ActivityKind.Internal,
                parentContext: rootContext,
                links: links,
                tags: tags?.Select(t => new KeyValuePair<string, object?>(t.tag, t.value))
            );
        }
    }

    extension(Activity activity)
    {
        /// <summary>
        /// Sets the activity status to error and associates the specified exception with the activity, if applicable.
        /// </summary>
        public void Errored(
            Exception? exception = null,
            string? errorMessage = null,
            IEnumerable<(string tag, object? value)>? tags = null,
            IEnumerable<ActivityEvent>? events = null
        )
        {
            activity.SetStatus(ActivityStatusCode.Error, errorMessage ?? exception?.Message);
            if (exception is not null)
            {
                activity.AddException(exception);
            }

            if (tags is not null)
            {
                foreach (var (tag, value) in tags)
                {
                    activity.SetTag(tag, value);
                }
            }

            if (events is not null)
            {
                foreach (var @event in events)
                {
                    activity.AddEvent(@event);
                }
            }
        }
    }
}
