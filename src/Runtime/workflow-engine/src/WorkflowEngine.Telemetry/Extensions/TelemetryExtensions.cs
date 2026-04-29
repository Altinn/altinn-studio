using System.Diagnostics;
using System.Diagnostics.Metrics;

// CA1708: C# 14 extension blocks generate synthetic members that trigger this false positive
#pragma warning disable CA1708

namespace WorkflowEngine.Telemetry.Extensions;

/// <summary>
/// Extensions over <see cref="ActivitySource"/>, <see cref="Activity"/>, <see cref="Counter{T}"/>,
/// and <see cref="Histogram{T}"/> that adapt the engine's tuple-based tag conventions to the
/// underlying OTEL key/value APIs.
/// </summary>
public static class TelemetryExtensions
{
    extension(ActivitySource source)
    {
        /// <summary>
        /// Starts a new activity with the specified name and optional kind, links and tags.
        /// </summary>
        /// <remarks>
        /// To create links from a stored trace context, see <see cref="Metrics.ParseTraceContext"/> method.
        /// </remarks>
        public Activity? StartActivity(
            string name,
            ActivityKind? kind = null,
            IEnumerable<ActivityLink>? links = null,
            ActivityContext? parentContext = null,
            IEnumerable<(string tag, object? value)>? tags = null
        ) =>
            source.StartActivity(
                name,
                kind ?? ActivityKind.Internal,
                parentContext: parentContext ?? default,
                links: links,
                tags: tags?.Select(t => new KeyValuePair<string, object?>(t.tag, t.value))
            );

        /// <summary>
        /// Starts a new activity with the specified name, kind, parent context, and optional tags.
        /// </summary>
        public Activity? StartActivity(
            string name,
            ActivityKind kind,
            ActivityContext parentContext,
            IEnumerable<(string tag, object? value)>? tags = null
        ) =>
            source.StartActivity(
                name,
                kind,
                parentContext: parentContext,
                links: null,
                tags: tags?.Select(t => new KeyValuePair<string, object?>(t.tag, t.value))
            );

        /// <summary>
        /// Starts a new root activity with the specified name and optional kind, links, and tags.
        /// </summary>
        public Activity? StartLinkedRootActivity(
            string name,
            ActivityKind? kind = null,
            IEnumerable<ActivityLink>? links = null,
            IEnumerable<(string tag, object? value)>? tags = null,
            bool includeCurrentContext = true
        )
        {
            var current = Activity.Current;
            Activity.Current = null;

            try
            {
                var activityLinks = new List<ActivityLink>(links ?? []);
                if (includeCurrentContext && current is not null)
                    activityLinks.Add(new ActivityLink(current.Context));

                return source.StartActivity(
                    name,
                    kind: kind ?? ActivityKind.Internal,
                    parentContext: default,
                    links: activityLinks,
                    tags: tags?.Select(t => new KeyValuePair<string, object?>(t.tag, t.value))
                );
            }
            finally
            {
                Activity.Current = current;
            }
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

        /// <summary>
        /// Explicitly sets the activity status to successful (overrides past .Errored() calls).
        /// </summary>
        public void Succeeded()
        {
            activity.SetStatus(ActivityStatusCode.Ok);
        }

        /// <summary>
        /// Marks the activity as not requesting tag/event data, suppressing detail collection on this span.
        /// </summary>
        public void NoData()
        {
            activity.IsAllDataRequested = false;
        }

        /// <summary>
        /// Marks the activity as requesting tag/event data, enabling detail collection on this span.
        /// </summary>
        public void HasData()
        {
            activity.IsAllDataRequested = true;
        }

        /// <summary>
        /// Suppresses both data collection and the recorded flag, ensuring this span is not exported.
        /// </summary>
        public void DontRecord()
        {
            activity.NoData();
            activity.ActivityTraceFlags &= ~ActivityTraceFlags.Recorded;
        }

        /// <summary>
        /// Enables data collection and the recorded flag, ensuring this span is exported.
        /// </summary>
        public void Record()
        {
            activity.HasData();
            activity.ActivityTraceFlags |= ActivityTraceFlags.Recorded;
        }
    }

    extension(Counter<long> counter)
    {
        /// <summary>
        /// Adds <paramref name="value"/> to the counter, attaching a single tuple-encoded tag.
        /// </summary>
        public void Add(long value, (string tag, object? value) tag)
        {
            counter.Add(value, new KeyValuePair<string, object?>(tag.tag, tag.value));
        }

        /// <summary>
        /// Adds <paramref name="value"/> to the counter, attaching tuple-encoded tags.
        /// </summary>
        public void Add(long value, params (string tag, object? value)[] tags)
        {
            counter.Add(value, tags.Select(t => new KeyValuePair<string, object?>(t.tag, t.value)).ToArray());
        }
    }

    extension(Histogram<double> histogram)
    {
        /// <summary>
        /// Records <paramref name="value"/> on the histogram, attaching a single tuple-encoded tag.
        /// </summary>
        public void Record(double value, (string tag, object? value) tag)
        {
            histogram.Record(value, new KeyValuePair<string, object?>(tag.tag, tag.value));
        }

        /// <summary>
        /// Records <paramref name="value"/> on the histogram, attaching tuple-encoded tags.
        /// </summary>
        public void Record(double value, params (string tag, object? value)[] tags)
        {
            histogram.Record(value, tags.Select(t => new KeyValuePair<string, object?>(t.tag, t.value)).ToArray());
        }
    }
}
