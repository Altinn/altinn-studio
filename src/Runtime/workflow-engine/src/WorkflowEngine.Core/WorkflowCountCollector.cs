using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Core.Extensions;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core;

/// <summary>
/// Feeds <see cref="Metrics.WorkflowCount"/> from its own read, on its own cadence, so a slow or failing read never
/// holds up the database-wide pass in <see cref="MetricsCollector"/>.
/// </summary>
internal sealed class WorkflowCountCollector(
    ILogger<WorkflowCountCollector> logger,
    IEngineRepository engineRepository,
    IOptions<EngineSettings> engineSettings,
    TimeProvider timeProvider
) : BackgroundService
{
    internal const string ScheduledStatus = "scheduled";

    internal static readonly string[] ReportedStatuses =
    [
        ScheduledStatus,
        .. PersistentItemStatusMap.Incomplete.Select(status => status.ToTelemetryValue()),
        .. PersistentItemStatusMap.Failed.Select(status => status.ToTelemetryValue()),
    ];

    /// <summary>
    /// The most namespaces the gauge names. The caller chooses the namespace, so the rest share
    /// <see cref="OtherNamespace"/>. The cardinality view in <c>AddTelemetry</c> has room for every series this allows.
    /// </summary>
    internal const int MaxNamedNamespaces = 1_000;

    /// <summary>
    /// The namespace the gauge counts the unnamed namespaces under. Stored namespaces are lowercase, so no real one
    /// matches it.
    /// </summary>
    internal const string OtherNamespace = "_OTHER";

    /// <summary>
    /// The namespaces the gauge has named since the process started. Each keeps all its series, at zero once empty.
    /// </summary>
    private readonly HashSet<string> _namedNamespaces = new(StringComparer.Ordinal);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var activity = Metrics.Source.StartActivity("WorkflowCountCollector.Collect");
            activity?.DontRecord();

            try
            {
                var counts = await engineRepository.CountIncompleteAndFailedWorkflowsByNamespace(stoppingToken);
                Metrics.SetWorkflowCounts(ToSeries(counts, _namedNamespaces));
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                Metrics.Errors.Add(1, (TelemetryAttributes.Operation, "metrics_collector"));
                logger.FailedToCountWorkflows(ex.Message, ex);
            }

            await Task.Delay(engineSettings.Value.WorkflowCountCollectionInterval, timeProvider, stoppingToken);
        }
    }

    /// <summary>
    /// One series per status for every namespace in <paramref name="namedNamespaces"/>, which this adds the new
    /// namespaces to until it holds <see cref="MaxNamedNamespaces"/>.
    /// </summary>
    /// <remarks>
    /// New namespaces are named in ordinal order, so replicas that start together over a database already past the
    /// cap name the same ones.
    /// </remarks>
    internal static List<(string Namespace, string Status, long Count)> ToSeries(
        IReadOnlyList<NamespaceStatusCount> counts,
        HashSet<string> namedNamespaces
    )
    {
        var byNamespaceAndStatus = new Dictionary<(string Namespace, string Status), long>();
        foreach (var count in counts.OrderBy(c => c.Namespace, StringComparer.Ordinal))
        {
            var ns = count.Namespace;
            if (!namedNamespaces.Contains(ns) && namedNamespaces.Count >= MaxNamedNamespaces)
                ns = OtherNamespace;
            namedNamespaces.Add(ns);

            var key = (ns, count.Scheduled ? ScheduledStatus : count.Status.ToTelemetryValue());
            byNamespaceAndStatus[key] = byNamespaceAndStatus.GetValueOrDefault(key) + count.Count;
        }

        return
        [
            .. namedNamespaces.SelectMany(ns =>
                ReportedStatuses.Select(status => (ns, status, byNamespaceAndStatus.GetValueOrDefault((ns, status))))
            ),
        ];
    }
}

internal static partial class WorkflowCountCollectorLogs
{
    [LoggerMessage(LogLevel.Error, "Failed to count the workflows per namespace: {ErrorMessage}")]
    internal static partial void FailedToCountWorkflows(
        this ILogger<WorkflowCountCollector> logger,
        string errorMessage,
        Exception ex
    );
}
