using System.Text.Encodings.Web;
using System.Text.Json;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

/// <summary>
/// The dashboard's trace link template: a URL with <see cref="DashboardSettings.TraceIdPlaceholder"/> where the trace
/// ID goes. The server resolves it from <see cref="DashboardSettings"/>, and the dashboard only substitutes the ID.
/// </summary>
internal static class TraceUrlTemplate
{
    private const string EncodedPlaceholder = "%7BtraceId%7D";

    /// <summary>
    /// Serializes like the browser's <c>JSON.stringify</c>, so the Grafana link is the one the dashboard built itself
    /// before the template existed. Nothing here is written into HTML: the dashboard escapes the finished URL.
    /// </summary>
    private static readonly JsonSerializerOptions _jsonStringify = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    /// <summary>
    /// Whether <paramref name="template"/> is an absolute http(s) URL containing the placeholder, spelled exactly.
    /// </summary>
    public static bool IsValid(string template)
    {
        if (!template.Contains(DashboardSettings.TraceIdPlaceholder, StringComparison.Ordinal))
            return false;

        string sample = template.Replace(DashboardSettings.TraceIdPlaceholder, "0", StringComparison.Ordinal);
        return Uri.TryCreate(sample, UriKind.Absolute, out Uri? uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    /// <summary>
    /// The template the dashboard builds its trace links from: <see cref="DashboardSettings.TraceUrlTemplate"/> when
    /// set, otherwise a Grafana Explore template when both Grafana settings are set, otherwise <c>null</c> and the
    /// dashboard draws no trace links.
    /// </summary>
    public static string? Resolve(DashboardSettings dashboard)
    {
        if (dashboard.TraceUrlTemplate is { } template)
            return template;

        if (dashboard.GrafanaUrl is { } grafanaUrl && dashboard.GrafanaTracesDatasourceUid is { } datasourceUid)
            return ForGrafanaExplore(grafanaUrl, datasourceUid);

        return null;
    }

    /// <summary>
    /// A Grafana Explore URL querying the trace ID in TraceQL on a Tempo datasource. With the URL-encoded trace ID
    /// substituted, it is the URL the dashboard built in the browser before the template existed, for every trace ID
    /// in W3C form and every datasource UID Grafana accepts.
    /// </summary>
    private static string ForGrafanaExplore(string grafanaUrl, string datasourceUid)
    {
        // The query is TraceQL, which only a Tempo datasource takes.
        var datasource = new { type = "tempo", uid = datasourceUid };
        var panes = new
        {
            trace = new
            {
                datasource = datasourceUid,
                queries = new[]
                {
                    new
                    {
                        refId = "A",
                        datasource,
                        queryType = "traceql",
                        query = DashboardSettings.TraceIdPlaceholder,
                    },
                },
                range = new { from = "now-24h", to = "now" },
            },
        };
        string encodedPanes = EncodeUriComponent(JsonSerializer.Serialize(panes, _jsonStringify))
            .Replace(EncodedPlaceholder, DashboardSettings.TraceIdPlaceholder, StringComparison.Ordinal);

        // No orgId: Grafana opens Explore in the viewer's current organization.
        return $"{grafanaUrl.TrimEnd('/')}/explore?schemaVersion=1&panes={encodedPanes}";
    }

    /// <summary>
    /// The browser's <c>encodeURIComponent</c>, which leaves <c>!'()*</c> as they are where
    /// <see cref="Uri.EscapeDataString(string)"/> escapes them.
    /// </summary>
    private static string EncodeUriComponent(string value) =>
        Uri.EscapeDataString(value)
            .Replace("%21", "!", StringComparison.Ordinal)
            .Replace("%27", "'", StringComparison.Ordinal)
            .Replace("%28", "(", StringComparison.Ordinal)
            .Replace("%29", ")", StringComparison.Ordinal)
            .Replace("%2A", "*", StringComparison.Ordinal);
}
