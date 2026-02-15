using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace WorkflowEngine.Api.Extensions;

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
            activity.HasData();
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

        public void NoData()
        {
            activity.IsAllDataRequested = false;
        }

        public void HasData()
        {
            activity.IsAllDataRequested = true;
        }
    }

    extension(Counter<long> counter)
    {
        public void Add(long value, (string tag, object? value) tag)
        {
            counter.Add(value, new KeyValuePair<string, object?>(tag.tag, tag.value));
        }

        public void Add(long value, (string tag, object? value) tag1, (string tag, object? value) tag2)
        {
            counter.Add(
                value,
                new KeyValuePair<string, object?>(tag1.tag, tag1.value),
                new KeyValuePair<string, object?>(tag2.tag, tag2.value)
            );
        }
    }

    extension(Histogram<double> histogram)
    {
        public void Record(double value, (string tag, object? value) tag)
        {
            histogram.Record(value, new KeyValuePair<string, object?>(tag.tag, tag.value));
        }

        public void Record(double value, params (string tag, object? value)[] tags)
        {
            histogram.Record(value, tags.Select(t => new KeyValuePair<string, object?>(t.tag, t.value)).ToArray());
        }
    }
}
