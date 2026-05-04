using System.Diagnostics;
using System.Text;
using OpenTelemetry.Logs;

namespace Altinn.App.Tests.Common.Utils;

public static class OtelVisualizers
{
    public static string VisualizeActivities(
        List<Activity> activities,
        List<LogRecord> logs,
        bool includeDuration = true,
        int initialIndent = 0
    )
    {
        // The current open telemetry setup collects all spans, and might collect from other tests running in parallel.
        // To avoid issues with collection modification during enumeration, we create copies of the lists before processing.
        activities = Copy(activities);
        var allActivitySpans = new HashSet<ActivitySpanId>(activities.Select(a => a.SpanId));
        var logsByActivityId = logs.GroupBy(l => l.SpanId)
            .ToDictionary(k => k.Key, v => v.OrderBy(l => l.Timestamp).ToList());
        var activityByParentId = activities
            .GroupBy(a => a.ParentSpanId)
            .ToDictionary(k => k.Key, g => g.OrderBy(a => a.StartTimeUtc).ToList());

        // Find root activities: those whose parent span ID is not in our collection
        var rootActivities = activities.Where(activity => !allActivitySpans.Contains(activity.ParentSpanId));

        var sb = new StringBuilder();
        int rootActivityCount = 0;
        foreach (var activity in rootActivities)
        {
            rootActivityCount++;
            VisualizeActivity(sb, activityByParentId, logsByActivityId, activity, initialIndent, includeDuration);
        }

        if (rootActivityCount == 0)
        {
            sb.AppendLine("No root activities found.");
        }

        // Find any logs that were not associated with any activity
        bool firstOrphanedLog = true;
        foreach (
            var (activitySpanId, activityLogs) in logsByActivityId.Where(kvp => !allActivitySpans.Contains(kvp.Key))
        )
        {
            if (firstOrphanedLog)
            {
                firstOrphanedLog = false;
                sb.AppendLine();
                sb.AppendLine("Orphaned Logs:");
            }
            sb.AppendLine($"Logs for ActivitySpanId: {activitySpanId}");
            foreach (var log in activityLogs)
            {
                sb.AppendLine($"[{log.LogLevel}] {log.FormattedMessage}");
            }
        }
        return sb.ToString();
    }

    // The current open telemetry setup, collects all spans, and might collect from other tests running in parallel.
    // Parallel executions only add new spans, so using indexes should be safe(ish), unless the list implementation has
    // race conditions if read while growing.
    private static List<Activity> Copy(List<Activity> list)
    {
        var count = list.Count;
        var copy = new List<Activity>(count);
        for (int i = 0; i < count; i++)
        {
            copy.Add(list[i]);
        }
        return copy;
    }

    private static void VisualizeActivity(
        StringBuilder sb,
        Dictionary<ActivitySpanId, List<Activity>> activityByParentId,
        Dictionary<ActivitySpanId, List<LogRecord>> logsByActivityId,
        Activity activity,
        int indent,
        bool includeDuration
    )
    {
        sb.Append(' ', indent);
        if (includeDuration)
        {
            sb.AppendLine($"{activity.DisplayName}  [Duration: {activity.Duration.TotalMilliseconds} ms]");
        }
        else
        {
            sb.AppendLine($"{activity.DisplayName}");
        }
        foreach (var (key, value) in activity.TagObjects)
        {
            sb.Append(' ', indent + 1);
            if (value is IEnumerable<string> enumerable)
            {
                sb.AppendLine($"{key}:");
                var count = 0;
                foreach (var item in enumerable)
                {
                    sb.Append(' ', indent + 2);
                    sb.AppendLine($"- {item}");
                    count++;
                }
                if (count == 0)
                {
                    sb.Append(' ', indent + 2);
                    sb.AppendLine("(empty list)");
                }
            }
            else
            {
                sb.AppendLine($"{key}: {value}");
            }
        }

        if (activityByParentId.TryGetValue(activity.SpanId, out var children))
        {
            foreach (var child in children)
            {
                VisualizeActivity(sb, activityByParentId, logsByActivityId, child, indent + 2, includeDuration);
            }
        }

        if (logsByActivityId.TryGetValue(activity.SpanId, out var logs) && logs.Count > 0)
        {
            sb.Append(' ', indent + 1);
            sb.AppendLine("Logs:");
            foreach (var log in logs)
            {
                sb.Append(' ', indent + 2);
                sb.AppendLine($"[{log.LogLevel}] {log.FormattedMessage}");
            }
        }
    }
}
