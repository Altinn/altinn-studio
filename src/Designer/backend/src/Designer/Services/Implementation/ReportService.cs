using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

namespace Altinn.Studio.Designer.Services.Implementation;

public class ReportService(
    IRuntimeGatewayClient runtimeGatewayClient,
    IAppResourcesService appResourcesService,
    INotificationService notificationService
) : IReportService
{
    private const int MinutesPerDay = 24 * 60;
    private const int MaxConcurrentAppMetadataRequests = 4;

    private const string FailedProcessNextMetric = "failed_process_next_requests";
    private const string FailedInstanceCreationMetric = "failed_instance_creation_requests";
    private const string ProcessesStartedMetric = "altinn_app_lib_processes_started";
    private const string ProcessesEndedMetric = "altinn_app_lib_processes_ended";

    private const string NoAppsText = "Ingen publiserte apper ble funnet i miljøet.";

    private static readonly IReadOnlyList<string> s_appTableHeaders =
    [
        "App",
        "Versjon",
        "App-bibliotek",
        "Feilende process/next",
        "Feilende instansieringer",
        "Påbegynte instanser",
        "Fullførte instanser",
    ];

    private static readonly CultureInfo s_norwegianCulture = CultureInfo.GetCultureInfo("nb-NO");
    private static readonly TimeZoneInfo s_norwegianTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Oslo");

    public async Task SendReportAsync(
        string org,
        string environment,
        ReportFrequency frequency,
        CancellationToken cancellationToken = default
    )
    {
        var rangeMinutes = GetRangeMinutes(frequency);
        var altinnEnvironment = AltinnEnvironment.FromName(environment);
        var to = DateTimeOffset.UtcNow;
        var from = to.Subtract(TimeSpan.FromMinutes(rangeMinutes));

        var reportMetrics = await runtimeGatewayClient.GetReportMetricsAsync(
            org,
            altinnEnvironment,
            rangeMinutes,
            cancellationToken
        );
        IReadOnlyDictionary<string, string?> appLibVersions = await GetAppLibVersionsAsync(
            org,
            environment,
            reportMetrics.Apps,
            cancellationToken
        );

        ILookup<string, Metric> metricsByApp = reportMetrics.Metrics.ToLookup(
            m => m.AppName,
            StringComparer.OrdinalIgnoreCase
        );
        ILookup<string, AllAppsErrorMetric> errorMetricsByApp = reportMetrics.ErrorMetrics.ToLookup(
            m => m.AppName,
            StringComparer.OrdinalIgnoreCase
        );

        List<AppSummary> appSummaries =
        [
            .. reportMetrics
                .Apps.Select(app => new AppSummary(
                    app.Name,
                    app.Version,
                    appLibVersions.GetValueOrDefault(app.Name),
                    SumCounts(errorMetricsByApp[app.Name], FailedProcessNextMetric),
                    SumCounts(errorMetricsByApp[app.Name], FailedInstanceCreationMetric),
                    SumCounts(metricsByApp[app.Name], ProcessesStartedMetric),
                    SumCounts(metricsByApp[app.Name], ProcessesEndedMetric)
                ))
                .OrderByDescending(app => app.HasActivity)
                .ThenBy(app => app.Name, StringComparer.Ordinal),
        ];

        string frequencyName = frequency.ToString().ToLowerInvariant();
        var payload = new NotificationPayload(
            $"report-{org}-{environment}-{frequencyName}-{to:yyyyMMdd_HHmmss}",
            $"Altinn Studio - {GetReportName(frequency)}",
            [("Organisasjon", org), ("Miljø", environment), ("Periode", FormatPeriod(from, to))],
            [],
            Body: appSummaries.Count == 0 ? NoAppsText : "",
            Table: appSummaries.Count == 0
                ? null
                : new NotificationTable(s_appTableHeaders, [.. appSummaries.Select(app => app.ToRow())])
        );

        await notificationService.NotifyReportContactPointsAsync(
            org,
            altinnEnvironment,
            frequency,
            payload,
            cancellationToken
        );
    }

    private async Task<IReadOnlyDictionary<string, string?>> GetAppLibVersionsAsync(
        string org,
        string environment,
        IReadOnlyList<ReportApp> apps,
        CancellationToken cancellationToken
    )
    {
        using var throttler = new SemaphoreSlim(MaxConcurrentAppMetadataRequests);
        var lookups = apps.Select(async app =>
        {
            await throttler.WaitAsync(cancellationToken);
            try
            {
                var applicationMetadata = await appResourcesService.GetApplicationMetadata(
                    org,
                    environment,
                    app.Name,
                    cancellationToken
                );
                return (app.Name, Version: ParseAppLibVersion(applicationMetadata.AltinnNugetVersion));
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // The report must tolerate individual apps being unreachable.
                return (app.Name, Version: null);
            }
            finally
            {
                throttler.Release();
            }
        });

        var results = await Task.WhenAll(lookups);
        return results.ToDictionary(r => r.Name, r => r.Version, StringComparer.OrdinalIgnoreCase);
    }

    private static string? ParseAppLibVersion(string? altinnNugetVersion)
    {
        if (string.IsNullOrEmpty(altinnNugetVersion))
        {
            return null;
        }
        return Version.TryParse(altinnNugetVersion, out var version) ? version.ToString(3) : null;
    }

    private static int GetRangeMinutes(ReportFrequency frequency) =>
        frequency switch
        {
            ReportFrequency.Daily => MinutesPerDay,
            ReportFrequency.Weekly => MinutesPerDay * 7,
            ReportFrequency.Monthly => MinutesPerDay * 30,
            _ => throw new ArgumentOutOfRangeException(
                nameof(frequency),
                frequency,
                "Report frequency must be Daily, Weekly, or Monthly"
            ),
        };

    private static string FormatPeriod(DateTimeOffset from, DateTimeOffset to) =>
        $"{FormatDateTime(from)} – {FormatDateTime(to)}";

    private static string FormatDateTime(DateTimeOffset value) =>
        TimeZoneInfo.ConvertTime(value, s_norwegianTimeZone).ToString("d.M.yyyy, HH:mm:ss", s_norwegianCulture);

    private static string GetReportName(ReportFrequency frequency) =>
        frequency switch
        {
            ReportFrequency.Daily => "daglig rapport",
            ReportFrequency.Weekly => "ukentlig rapport",
            ReportFrequency.Monthly => "månedlig rapport",
            _ => throw new ArgumentOutOfRangeException(nameof(frequency), frequency, null),
        };

    private static double SumCounts(IEnumerable<Metric> metrics, string metricName) =>
        metrics.Where(metric => metric.Name == metricName).SelectMany(metric => metric.Counts).Sum();

    private static double SumCounts(IEnumerable<AllAppsErrorMetric> metrics, string metricName) =>
        metrics.Where(metric => metric.Name == metricName).SelectMany(metric => metric.Counts).Sum();

    private static string FormatCount(double count) => count.ToString("#,0.##", s_norwegianCulture);

    private sealed record AppSummary(
        string Name,
        string? Version,
        string? AppLibVersion,
        double FailedProcessNextRequests,
        double FailedInstanceCreationRequests,
        double ProcessesStarted,
        double ProcessesEnded
    )
    {
        public bool HasActivity =>
            FailedProcessNextRequests + FailedInstanceCreationRequests + ProcessesStarted + ProcessesEnded > 0;

        public IReadOnlyList<string?> ToRow() =>
            [
                Name,
                Version,
                AppLibVersion,
                FormatCount(FailedProcessNextRequests),
                FormatCount(FailedInstanceCreationRequests),
                FormatCount(ProcessesStarted),
                FormatCount(ProcessesEnded),
            ];
    }
}
