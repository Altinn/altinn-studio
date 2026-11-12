using System.Diagnostics;
using System.Globalization;
using System.Net;
using System.Text.Json;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Api.Telemetry;
using Azure;
using Azure.Core;
using Azure.Identity;
using Azure.Monitor.Query.Logs;
using Azure.Monitor.Query.Logs.Models;
using Azure.ResourceManager.OperationalInsights;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Clients.MetricsClient;

internal sealed class AzureMonitorClient(
    IOptionsMonitor<GatewayContext> _gatewayContext,
    LogsQueryClient _logsQueryClient,
    GatewayMetrics _metrics,
    ILogger<AzureMonitorClient> _logger
) : IMetricsClient
{
    private const int MaxRange = 10080;

    // Periodic reports cover up to a calendar month: 31 days, plus the hour gained when daylight saving time ends.
    internal static readonly TimeSpan MaxReportPeriod = TimeSpan.FromDays(31) + TimeSpan.FromHours(1);
    private const int MaxActivityWindowDays = 30;

    /// <summary>
    /// The requests whose failures the gateway counts, and that Grafana's alert rules for apps fire on. Each key is
    /// both a metric name and an alert rule's <c>ruleId</c>, so a new rule in <c>infra/runtime/grafana-manifests</c>
    /// needs a kind here. Each kind lists the operation names that the Application Insights SDK, which apps use by
    /// default, and OpenTelemetry report for the request.
    /// </summary>
    private static readonly IReadOnlyDictionary<string, FailedRequestKind> _failedRequestKinds = new Dictionary<
        string,
        FailedRequestKind
    >
    {
        {
            "failed_process_next_requests",
            new FailedRequestKind(
                [
                    "PUT Process/NextElement [app/instanceGuid/instanceOwnerPartyId/org]",
                    "PUT {org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/process/next",
                ],
                LowestFailedStatusCode: 500
            )
        },
        {
            "failed_instance_creation_requests",
            new FailedRequestKind(
                [
                    "POST Instances/Post [app/org]",
                    "POST Instances/PostSimplified [app/org]",
                    "POST {org}/{app}/instances",
                    "POST {org}/{app}/instances/create",
                ],
                LowestFailedStatusCode: 500
            )
        },
        {
            // The workflow engine's callbacks to a v9 app. The engine fails a step at once on most 4xx answers, so
            // these count from 400. The engine retries a failing step for a day, so a count of attempts tells a
            // service owner nothing they can act on, and these count instances instead.
            "failed_workflow_callback_requests",
            new FailedRequestKind(
                [
                    "POST WorkflowEngineCallback/ExecuteCommand [app/commandKey/instanceGuid/instanceOwnerPartyId/org]",
                    "POST {org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/workflow-engine-callbacks/{commandKey}",
                ],
                LowestFailedStatusCode: 400,
                CountsInstances: true
            )
        },
    };

    internal static IReadOnlyCollection<string> OperationNameKeys { get; } = _failedRequestKinds.Keys.ToArray();

    /// <summary>
    /// The KQL condition that matches the failed requests of every kind, on the workspace's <c>AppRequests</c> table.
    /// Both the Application Insights SDK and the OpenTelemetry exporter mark a response from 400 up as unsuccessful,
    /// so a kind's lowest failed status code is the only difference between them.
    /// </summary>
    private static readonly string _failedRequestCondition = string.Join(
        " or ",
        _failedRequestKinds
            .Values.GroupBy(kind => kind.LowestFailedStatusCode)
            .Select(group =>
                $"(toint(ResultCode) >= {group.Key} and OperationName in ({KqlStrings(group.SelectMany(kind => kind.OperationNames))}))"
            )
    );

    /// <summary>
    /// The KQL expression that names the kind of a failed request, so that a kind that several operation names report
    /// counts once.
    /// </summary>
    private static readonly string _failedRequestName =
        "case("
        + string.Join(
            ", ",
            _failedRequestKinds.Select(kind =>
                $"OperationName in ({KqlStrings(kind.Value.OperationNames)}), '{kind.Key}'"
            )
        )
        + ", '')";

    /// <summary>
    /// A KQL statement that binds <c>failed</c> to the failed requests of every kind, with the kind in <c>Name</c> and
    /// the instance the request was for in <c>InstanceId</c>.
    /// </summary>
    private static readonly string _letFailedRequests = $"""
        let failed = AppRequests
            | where Success == false
            | where ClientType != 'Browser'
            | where {_failedRequestCondition}
            | extend Name = {_failedRequestName}, InstanceId = extract(@'/instances/\d+/([^/]+)', 1, Url);
        """;

    /// <summary>
    /// The KQL aggregations that <see cref="_failedRequestCount"/> picks from.
    /// </summary>
    private const string FailedRequestAggregates = "Requests = count(), Instances = dcount(InstanceId)";

    /// <summary>
    /// The KQL expression for the count of a kind: its requests, or the instances they were for.
    /// </summary>
    private static readonly string _failedRequestCount = _failedRequestKinds.Any(kind => kind.Value.CountsInstances)
        ? $"iff(Name in ({KqlStrings(_failedRequestKinds.Where(kind => kind.Value.CountsInstances).Select(kind => kind.Key))}), todouble(Instances), todouble(Requests))"
        : "todouble(Requests)";

    /// <summary>
    /// A KQL query that counts the failed requests in <paramref name="source"/> per bin and for the whole time range,
    /// where a row without a bin holds the count for the whole range. A kind that counts instances cannot sum its
    /// bins instead, since one instance can fail in several of them.
    /// </summary>
    private static string CountPerBinAndInTotal(string source, string groupBy, string interval) =>
        $"""
            {source}
            | summarize {FailedRequestAggregates} by {groupBy}, DateTimeOffset = bin(TimeGenerated, {interval})
            | union ({source} | summarize {FailedRequestAggregates} by {groupBy})
            | project {groupBy}, DateTimeOffset, Count = {_failedRequestCount}
            | order by DateTimeOffset desc
            """;

    /// <summary>
    /// Reads the rows that <see cref="CountPerBinAndInTotal"/> returns for one kind.
    /// </summary>
    private static (long[] Timestamps, double[] Counts, double Total) ReadBinsAndTotal(IEnumerable<LogsTableRow> rows)
    {
        List<long> timestamps = [];
        List<double> counts = [];
        double total = 0;
        foreach (LogsTableRow row in rows)
        {
            double count = row.GetDouble("Count") ?? 0;
            if (row.GetDateTimeOffset("DateTimeOffset") is { } bin)
            {
                timestamps.Add(bin.ToUnixTimeMilliseconds());
                counts.Add(count);
            }
            else
            {
                total = count;
            }
        }
        return (timestamps.ToArray(), counts.ToArray(), total);
    }

    private static string KqlStrings(IEnumerable<string> values) =>
        string.Join(", ", values.Select(value => $"'{value.Replace("'", "''")}'"));

    internal static IReadOnlyCollection<string> MetricNames { get; } =
    ["altinn_app_lib_processes_started", "altinn_app_lib_processes_ended"];

    internal static int GetBucketSize(int range)
    {
        var maxPoints = 12;
        return (int)Math.Max(1, Math.Ceiling((double)range / maxPoints));
    }

    internal static bool IsValidReportPeriod(DateTimeOffset from, DateTimeOffset to) =>
        from < to && to - from <= MaxReportPeriod;

    internal static int GetPeriodMinutes(DateTimeOffset from, DateTimeOffset to) =>
        (int)Math.Ceiling((to - from).TotalMinutes);

    private static string GetInterval(int range)
    {
        var bucketSize = GetBucketSize(range);
        return $"{bucketSize}m";
    }

    /// <summary>
    /// Runs a query in its own span, and records its duration and outcome.
    /// </summary>
    private async Task<Response<LogsQueryResult>> Query(
        string queryKind,
        ResourceIdentifier workspaceId,
        string query,
        LogsQueryTimeRange timeRange,
        CancellationToken cancellationToken
    )
    {
        Activity? caller = Activity.Current;
        using Activity? span = ServiceTelemetry.Source.StartActivity("AzureMonitorClient.Query");
        span?.SetTag(ServiceTelemetry.Attributes.AzureMonitorQuery, queryKind);
        long start = Stopwatch.GetTimestamp();
        string? errorType = null;
        try
        {
            return await _logsQueryClient.QueryResourceAsync(
                workspaceId,
                query,
                timeRange,
                cancellationToken: cancellationToken
            );
        }
        catch (Exception ex)
        {
            errorType = ServiceTelemetry.ErrorTypeOf(ex);
            span.SetError(errorType);
            // Most callers answer with an unavailable result instead of failing, so the entry span would look successful.
            ServiceTelemetry.EntrySpanOf(caller).SetError(errorType);
            throw;
        }
        finally
        {
            _metrics.RecordAzureMonitorQuery(queryKind, Stopwatch.GetElapsedTime(start), errorType);
        }
    }

    private ResourceIdentifier GetApplicationLogAnalyticsWorkspaceId()
    {
        var gatewayContext = _gatewayContext.CurrentValue;
        return OperationalInsightsWorkspaceResource.CreateResourceIdentifier(
            gatewayContext.AzureSubscriptionId,
            $"monitor-{gatewayContext.ServiceOwner}-{gatewayContext.Environment}-rg",
            $"application-{gatewayContext.ServiceOwner}-{gatewayContext.Environment}-law"
        );
    }

    public async Task<IEnumerable<FailedRequest>> GetFailedRequests(int range, CancellationToken cancellationToken)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(range);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(range, MaxRange);

        var logAnalyticsWorkspaceId = GetApplicationLogAnalyticsWorkspaceId();

        var query = $"""
            {_letFailedRequests}
            failed
            | summarize {FailedRequestAggregates} by AppRoleName, Name
            | project AppRoleName, Name, Count = {_failedRequestCount}
            """;

        Response<LogsQueryResult> response = await Query(
            "failed_requests",
            logAnalyticsWorkspaceId,
            query,
            new LogsQueryTimeRange(TimeSpan.FromMinutes(range)),
            cancellationToken
        );

        return response.Value.Table.Rows.Select(row => new FailedRequest
        {
            Name = row.GetString("Name"),
            AppName = row.GetString("AppRoleName"),
            Count = row.GetDouble("Count") ?? 0,
        });
    }

    public async Task<ActiveAppsResult> GetActiveApps(int windowDays, CancellationToken cancellationToken)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(windowDays);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(windowDays, MaxActivityWindowDays);

        try
        {
            var logAnalyticsWorkspaceId = GetApplicationLogAnalyticsWorkspaceId();
            var query =
                $@"
                AppRequests
                | where TimeGenerated > ago({windowDays}d)
                | where Name != 'GET /health'
                | summarize Count = count() by AppRoleName";

            Response<LogsQueryResult> response = await Query(
                "active_apps",
                logAnalyticsWorkspaceId,
                query,
                new LogsQueryTimeRange(TimeSpan.FromDays(windowDays)),
                cancellationToken
            );

            var activeAppRows = response
                .Value.Table.Rows.Select(row => new
                {
                    AppName = row.GetString("AppRoleName") ?? string.Empty,
                    Count = row.GetDouble("Count") ?? 0,
                })
                .Where(static row => row.AppName.Length > 0)
                .GroupBy(static row => row.AppName, StringComparer.Ordinal)
                .Select(group => new { AppName = group.Key, Count = group.Sum(row => row.Count) })
                .ToArray();

            var activeAppRequestCounts = activeAppRows.ToDictionary(
                static row => row.AppName,
                static row => row.Count,
                StringComparer.Ordinal
            );

            return new ActiveAppsResult { Status = ActivityStatus.Ok, ActiveAppRequestCounts = activeAppRequestCounts };
        }
        catch (CredentialUnavailableException ex)
        {
            _logger.LogWarning(ex, "Azure Monitor credentials are unavailable while getting active apps.");
            return new ActiveAppsResult
            {
                Status = ActivityStatus.Unavailable,
                ActiveAppRequestCounts = new Dictionary<string, double>(),
            };
        }
        catch (AuthenticationFailedException ex)
        {
            _logger.LogWarning(ex, "Azure Monitor authentication failed while getting active apps.");
            return new ActiveAppsResult
            {
                Status = ActivityStatus.Unavailable,
                ActiveAppRequestCounts = new Dictionary<string, double>(),
            };
        }
        catch (RequestFailedException ex)
        {
            _logger.LogWarning(ex, "Azure Monitor request failed while getting active apps.");
            return new ActiveAppsResult
            {
                Status = ActivityStatus.Unavailable,
                ActiveAppRequestCounts = new Dictionary<string, double>(),
            };
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while getting active apps from Azure Monitor.");
            return new ActiveAppsResult
            {
                Status = ActivityStatus.Error,
                ActiveAppRequestCounts = new Dictionary<string, double>(),
            };
        }
    }

    public async Task<AppActivitySignalsResult> GetAppActivitySignals(
        int windowDays,
        CancellationToken cancellationToken
    )
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(windowDays);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(windowDays, MaxActivityWindowDays);

        try
        {
            var logAnalyticsWorkspaceId = GetApplicationLogAnalyticsWorkspaceId();
            Response<LogsQueryResult> response = await Query(
                "activity_signals",
                logAnalyticsWorkspaceId,
                AppActivitySignalQueries.BuildQuery(windowDays),
                new LogsQueryTimeRange(TimeSpan.FromDays(windowDays)),
                cancellationToken
            );

            var signals = response
                .Value.Table.Rows.Select(row => new AppActivitySignalRow(
                    row.GetString("AppRoleName") ?? string.Empty,
                    row.GetString("Category") ?? string.Empty,
                    row.GetDouble("Count") ?? 0,
                    row.GetDateTimeOffset("LastSeenAt") ?? DateTimeOffset.MinValue
                ))
                .Where(static row => row.App.Length > 0)
                .ToArray();

            return new AppActivitySignalsResult { Status = ActivityStatus.Ok, Signals = signals };
        }
        catch (CredentialUnavailableException ex)
        {
            _logger.LogWarning(ex, "Azure Monitor credentials are unavailable while getting app activity signals.");
            return new AppActivitySignalsResult { Status = ActivityStatus.Unavailable, Signals = [] };
        }
        catch (AuthenticationFailedException ex)
        {
            _logger.LogWarning(ex, "Azure Monitor authentication failed while getting app activity signals.");
            return new AppActivitySignalsResult { Status = ActivityStatus.Unavailable, Signals = [] };
        }
        catch (RequestFailedException ex)
        {
            _logger.LogWarning(ex, "Azure Monitor request failed while getting app activity signals.");
            return new AppActivitySignalsResult { Status = ActivityStatus.Unavailable, Signals = [] };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException ex)
        {
            _logger.LogWarning(ex, "Azure Monitor request timed out while getting app activity signals.");
            return new AppActivitySignalsResult { Status = ActivityStatus.Unavailable, Signals = [] };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while getting app activity signals from Azure Monitor.");
            return new AppActivitySignalsResult { Status = ActivityStatus.Error, Signals = [] };
        }
    }

    public async Task<IEnumerable<AppFailedRequest>> GetAppFailedRequests(
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(range);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(range, MaxRange);

        var logAnalyticsWorkspaceId = GetApplicationLogAnalyticsWorkspaceId();

        var interval = GetInterval(range);

        var query = $"""
            {_letFailedRequests}
            let appFailed = failed | where AppRoleName == '{app.Replace("'", "''")}';
            {CountPerBinAndInTotal("appFailed", "Name", interval)}
            """;

        Response<LogsQueryResult> response = await Query(
            "app_failed_requests",
            logAnalyticsWorkspaceId,
            query,
            new LogsQueryTimeRange(TimeSpan.FromMinutes(range)),
            cancellationToken
        );

        var metrics = response
            .Value.Table.Rows.GroupBy(row => row.GetString("Name"))
            .Select(group =>
            {
                var (timestamps, counts, total) = ReadBinsAndTotal(group);
                return new AppFailedRequest
                {
                    Name = group.Key,
                    Timestamps = timestamps,
                    Counts = counts,
                    Count = total,
                };
            })
            .ToList();

        return _failedRequestKinds.Select(name =>
            metrics.FirstOrDefault(metric => metric.Name == name.Key)
            ?? new AppFailedRequest
            {
                Name = name.Key,
                Timestamps = [],
                Counts = [],
                Count = 0,
            }
        );
    }

    public async Task<IEnumerable<Metric>> GetMetrics(
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken
    )
    {
        ThrowIfInvalidReportPeriod(from, to);

        var names = MetricNames;

        var logAnalyticsWorkspaceId = GetApplicationLogAnalyticsWorkspaceId();

        var interval = GetInterval(GetPeriodMinutes(from, to));

        var query =
            $@"
                AppMetrics
                | where Name in ('{string.Join("','", names)}')
                | summarize Count = sum(Sum) by Name, AppRoleName, DateTimeOffset = bin(TimeGenerated, {interval})
                | order by DateTimeOffset desc";

        Response<LogsQueryResult> response = await Query(
            "metrics",
            logAnalyticsWorkspaceId,
            query,
            new LogsQueryTimeRange(from, to),
            cancellationToken
        );

        return response
            .Value.Table.Rows.GroupBy(row => (AppName: row.GetString("AppRoleName"), Name: row.GetString("Name")))
            .Select(group => new Metric
            {
                AppName = group.Key.AppName,
                Name = group.Key.Name,
                Timestamps = group.Select(row =>
                    row.GetDateTimeOffset("DateTimeOffset")?.ToUnixTimeMilliseconds() ?? 0
                ),
                Counts = group.Select(row => row.GetDouble("Count") ?? 0),
            });
    }

    public async Task<IEnumerable<AllAppsFailedRequest>> GetAllAppsFailedRequests(
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken
    )
    {
        ThrowIfInvalidReportPeriod(from, to);

        var logAnalyticsWorkspaceId = GetApplicationLogAnalyticsWorkspaceId();

        var interval = GetInterval(GetPeriodMinutes(from, to));

        var query = $"""
            {_letFailedRequests}
            {CountPerBinAndInTotal("failed", "AppRoleName, Name", interval)}
            """;

        Response<LogsQueryResult> response = await Query(
            "all_apps_failed_requests",
            logAnalyticsWorkspaceId,
            query,
            new LogsQueryTimeRange(from, to),
            cancellationToken
        );

        return response
            .Value.Table.Rows.GroupBy(row => (AppName: row.GetString("AppRoleName"), Name: row.GetString("Name")))
            .Select(group =>
            {
                var (timestamps, counts, total) = ReadBinsAndTotal(group);
                return new AllAppsFailedRequest
                {
                    AppName = group.Key.AppName,
                    Name = group.Key.Name,
                    Timestamps = timestamps,
                    Counts = counts,
                    Count = total,
                };
            });
    }

    private static void ThrowIfInvalidReportPeriod(DateTimeOffset from, DateTimeOffset to)
    {
        if (!IsValidReportPeriod(from, to))
        {
            throw new ArgumentOutOfRangeException(
                nameof(to),
                to,
                $"The report period must start before it ends and last at most {MaxReportPeriod}."
            );
        }
    }

    public async Task<IEnumerable<AppMetric>> GetAppMetrics(string app, int range, CancellationToken cancellationToken)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(range);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(range, MaxRange);

        var names = MetricNames;

        var logAnalyticsWorkspaceId = GetApplicationLogAnalyticsWorkspaceId();

        var interval = GetInterval(range);

        var query =
            $@"
                AppMetrics
                | where AppRoleName == '{app.Replace("'", "''")}'
                | where Name in ('{string.Join("','", names)}')
                | summarize Count = sum(Sum) by Name, DateTimeOffset = bin(TimeGenerated, {interval})
                | order by DateTimeOffset desc";

        Response<LogsQueryResult> response = await Query(
            "app_metrics",
            logAnalyticsWorkspaceId,
            query,
            new LogsQueryTimeRange(TimeSpan.FromMinutes(range)),
            cancellationToken
        );

        var metrics = response
            .Value.Table.Rows.GroupBy(row => row.GetString("Name"))
            .Select(group => new AppMetric
            {
                Name = group.Key,
                Timestamps = group.Select(row =>
                    row.GetDateTimeOffset("DateTimeOffset")?.ToUnixTimeMilliseconds() ?? 0
                ),
                Counts = group.Select(row => row.GetDouble("Count") ?? 0),
            });

        return names.Select(name =>
            metrics.FirstOrDefault(metric => metric.Name == name)
            ?? new AppMetric
            {
                Name = name,
                Timestamps = [],
                Counts = [],
            }
        );
    }

    public Uri GetLogsUrl(
        string subscriptionId,
        string org,
        string env,
        IReadOnlyCollection<string> apps,
        string metricName,
        DateTimeOffset from,
        DateTimeOffset to
    )
    {
        if (!_failedRequestKinds.TryGetValue(metricName, out var kind))
            throw new ArgumentException(
                $"Unknown metricName '{metricName}'. Valid values: {string.Join(", ", OperationNameKeys)}",
                nameof(metricName)
            );

        string jsonPath = Path.Combine(AppContext.BaseDirectory, "Clients", "MetricsClient", "logsQueryTemplate.json");
        var fromUtc = from.ToUniversalTime();
        var toUtc = to.ToUniversalTime();
        var durationMs = (long)(toUtc - fromUtc).TotalMilliseconds;
        string jsonTemplate = File.ReadAllText(jsonPath);
        string json = jsonTemplate
            .Replace("{from}", fromUtc.ToString("O", CultureInfo.InvariantCulture))
            .Replace("{to}", toUtc.ToString("O", CultureInfo.InvariantCulture))
            .Replace("{durationMs}", durationMs.ToString(CultureInfo.InvariantCulture))
            .Replace("{app_Names}", string.Join(", ", apps.Select(n => $"'{n.Replace("'", "''")}'")))
            .Replace("{lowest_Failed_Status_Code}", kind.LowestFailedStatusCode.ToString(CultureInfo.InvariantCulture))
            .Replace("{operation_Names}", KqlStrings(kind.OperationNames))
            .Replace("\"{appNames}\"", string.Join(", ", apps.Select(name => $"\"{JsonEncodedText.Encode(name)}\"")))
            .Replace("\"{operationNames}\"", string.Join(",", kind.OperationNames.Select(n => $"\"{n}\"")))
            .Replace("\"{resultCodes}\"", string.Join(",", kind.FailedStatusCodes.Select(code => $"\"{code}\"")));
        var minifiedJson = System.Text.Json.Nodes.JsonNode.Parse(json)?.ToJsonString() ?? string.Empty;

        string encodedLogsQuery = Uri.EscapeDataString(minifiedJson);

        string encodedApplicationInsightsId = Uri.EscapeDataString(
            $"/subscriptions/{subscriptionId}/resourceGroups/monitor-{org}-{env}-rg/providers/Microsoft.Insights/components/{org}-{env}-ai"
        );
        var url =
            $"https://portal.azure.com/#blade/AppInsightsExtension/BladeRedirect/BladeName/searchV1/ResourceId/{encodedApplicationInsightsId}/BladeInputs/{encodedLogsQuery}";

        return new Uri(url);
    }

    /// <param name="OperationNames">The names apps report for the request in Application Insights.</param>
    /// <param name="LowestFailedStatusCode">The lowest response status that counts as a failure.</param>
    /// <param name="CountsInstances">
    /// Whether the kind counts the instances its failed requests were for, rather than the requests.
    /// </param>
    private sealed record FailedRequestKind(
        string[] OperationNames,
        int LowestFailedStatusCode,
        bool CountsInstances = false
    )
    {
        /// <summary>
        /// The status codes from <see cref="LowestFailedStatusCode"/> up, for the response code filter that the
        /// Application Insights search shows.
        /// </summary>
        public IEnumerable<int> FailedStatusCodes =>
            Enum.GetValues<HttpStatusCode>()
                .Select(code => (int)code)
                .Where(code => code >= LowestFailedStatusCode)
                .Distinct()
                .Order();
    }
}
