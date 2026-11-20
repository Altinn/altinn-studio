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
    /// <summary>
    /// The <c>error.type</c> of a failure that has no more specific class: the semantic conventions' fallback.
    /// </summary>
    public const string OtherErrorType = "_OTHER";

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
        /// Marks the activity as failed by <paramref name="exception"/>: status Error with the exception's message,
        /// and <c>error.type</c> set to the exception's full type name.
        /// </summary>
        /// <remarks>
        /// The exception is not recorded on the span. Its details, stack trace included, belong in an ERROR log
        /// written in the same trace, by the caller or wherever the exception ends up handled.
        /// </remarks>
        public void Errored(Exception exception)
        {
            activity.SetStatus(ActivityStatusCode.Error, exception.Message);
            activity.SetTag(TelemetryAttributes.ErrorType, exception.GetType().FullName ?? exception.GetType().Name);
        }

        /// <summary>
        /// Marks the activity as failed without an exception: status Error with <paramref name="errorMessage"/>,
        /// and <c>error.type</c> set to <paramref name="errorType"/>.
        /// </summary>
        /// <param name="errorType">
        /// The class of the failure: a low-cardinality reason the engine already names at the call site, such as
        /// <c>lease_lost</c> or <c>canceled</c>, or <see cref="OtherErrorType"/> when there is none. Never a
        /// value from a request.
        /// </param>
        /// <param name="errorMessage">The span's status description.</param>
        public void Errored(string errorType, string? errorMessage = null)
        {
            activity.SetStatus(ActivityStatusCode.Error, errorMessage);
            activity.SetTag(TelemetryAttributes.ErrorType, errorType);
        }

        /// <summary>
        /// Explicitly sets the activity status to successful, overriding an earlier <c>Errored</c> call along with
        /// the <c>error.type</c> it set.
        /// </summary>
        public void Succeeded()
        {
            activity.SetStatus(ActivityStatusCode.Ok);
            activity.SetTag(TelemetryAttributes.ErrorType, null);
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
