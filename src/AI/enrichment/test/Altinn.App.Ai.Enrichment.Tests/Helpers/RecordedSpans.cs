using System.Diagnostics;
using Altinn.App.Ai.Enrichment.Telemetry;

namespace Altinn.App.Ai.Enrichment.Tests.Helpers;

/// <summary>
/// Captures the spans the enrichment engine emits, without an OpenTelemetry
/// pipeline in the way. A bare <see cref="ActivityListener"/> exercises exactly
/// the code under test — the tags we set and the parents we produce — rather
/// than the SDK's export path, which is not ours to verify.
///
/// Sampling must be <see cref="ActivitySamplingResult.AllDataAndRecorded"/>:
/// anything weaker and the runtime drops the tags, so every assertion here would
/// pass vacuously against an empty bag.
/// </summary>
internal sealed class RecordedSpans : IDisposable
{
    private readonly ActivityListener _listener;
    private readonly List<Activity> _stopped = [];
    private readonly object _gate = new();

    public RecordedSpans()
    {
        _listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == EnrichmentActivitySource.Name,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = activity =>
            {
                lock (_gate)
                    _stopped.Add(activity);
            },
        };
        ActivitySource.AddActivityListener(_listener);
    }

    public IReadOnlyList<Activity> Stopped
    {
        get
        {
            lock (_gate)
                return _stopped.ToList();
        }
    }

    public Activity Root() => Stopped.Single(a => a.Parent is null);

    public Activity Single(string name) => Stopped.Single(a => a.OperationName == name);

    public IReadOnlyList<Activity> Named(string name) =>
        Stopped.Where(a => a.OperationName == name).ToList();

    public IReadOnlyList<Activity> ChildrenOf(Activity parent) =>
        Stopped.Where(a => a.ParentSpanId == parent.SpanId).ToList();

    public IReadOnlyList<Activity> OfType(string observationType) =>
        Stopped.Where(a => Tag(a, "langfuse.observation.type") == observationType).ToList();

    public static string? Tag(Activity activity, string key) =>
        activity.GetTagItem(key)?.ToString();

    public static string? Metadata(Activity activity, string key) =>
        Tag(activity, "langfuse.observation.metadata." + key);

    public static string? TraceMetadata(Activity activity, string key) =>
        Tag(activity, "langfuse.trace.metadata." + key);

    public void Dispose() => _listener.Dispose();
}

/// <summary>
/// <see cref="ActivityListener"/> registration is process-wide, so two test classes
/// listening at once would capture each other's spans and every
/// <c>Single(...)</c> assertion would be a coin flip. Everything that records spans
/// joins this collection, which xUnit runs serially.
/// </summary>
[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class ActivityListenerCollection
{
    public const string Name = "ActivityListener";
}
