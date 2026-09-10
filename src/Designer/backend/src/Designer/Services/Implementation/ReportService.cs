using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Models.Reports;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Microsoft.Extensions.Caching.Memory;

namespace Altinn.Studio.Designer.Services.Implementation;

public class ReportService(
    IRuntimeGatewayClient runtimeGatewayClient,
    IAppResourcesService appResourcesService,
    IMemoryCache memoryCache,
    INotificationService notificationService,
    GeneralSettings generalSettings
) : IReportService
{
    private const int MinutesPerDay = 24 * 60;
    private const int MaxConcurrentAppMetadataRequests = 4;

    private const string FailedProcessNextRequests = "failed_process_next_requests";
    private const string FailedInstanceCreationRequests = "failed_instance_creation_requests";
    private const string ProcessesStarted = "altinn_app_lib_processes_started";
    private const string ProcessesEnded = "altinn_app_lib_processes_ended";

    private static readonly CultureInfo s_norwegianCulture = CultureInfo.GetCultureInfo("nb-NO");
    private static readonly TimeZoneInfo s_norwegianTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Oslo");

    public async Task GenerateReportPdfAsync(
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

        IReadOnlyList<ReportApp> apps = reportMetrics.Apps;
        IReadOnlyDictionary<string, string?> appLibVersions = await GetAppLibVersionsAsync(
            org,
            environment,
            apps,
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

        string frequencyStr = frequency.ToString().ToLowerInvariant();

        List<AppReportData> appReports =
        [
            .. apps.Select(app => new AppReportData
                {
                    AppName = app.Name,
                    Version = app.Version,
                    AppLibVersion = appLibVersions.GetValueOrDefault(app.Name),
                    Metrics = metricsByApp[app.Name],
                    ErrorMetrics =
                    [
                        .. errorMetricsByApp[app.Name]
                            .Select(e => new AppErrorMetric
                            {
                                Name = e.Name,
                                Timestamps = e.Timestamps,
                                Counts = e.Counts,
                                BucketSize = e.BucketSize,
                                LogsUrl = e.LogsUrl,
                            }),
                    ],
                })
                .OrderByDescending(a =>
                    a.Metrics.Any(m => m.Timestamps.Any()) || a.ErrorMetrics.Any(e => e.Timestamps.Any())
                ),
        ];

        var reportData = new ReportData
        {
            Org = org,
            Environment = environment,
            From = from,
            To = to,
            Apps = appReports,
        };

        var token = Guid.NewGuid().ToString("N");
        memoryCache.Set($"reportData:{token}", reportData, TimeSpan.FromMinutes(2));

        var renderUrl =
            $"{generalSettings.BaseUrl}/admin/reports/render?token={token}&org={org}&env={environment}&frequency={frequencyStr}";

        var payload = new NotificationPayload(
            $"report-{org}-{environment}-{frequencyStr}-{to:yyyyMMdd_HHmmss}",
            "Altinn Studio - periodisk rapport",
            [("Organisasjon", org), ("Miljø", environment), ("Periode", FormatPeriod(from, to))],
            [],
            FormatAppSummaries(appReports)
        );

        byte[] pdf = await runtimeGatewayClient.GeneratePdfAsync(org, altinnEnvironment, renderUrl, cancellationToken);
        await notificationService.NotifyReportContactPointsAsync(
            org,
            altinnEnvironment,
            frequency,
            payload,
            pdf,
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

    private static string FormatAppSummaries(IEnumerable<AppReportData> appReports) =>
        string.Join("\n\n", appReports.Select(FormatAppSummary));

    private static string FormatAppSummary(AppReportData appReport) =>
        $"""
            *{appReport.AppName}*{FormatAppVersions(appReport)}
            • `{FormatCount(GetErrorCount(appReport, FailedProcessNextRequests))}` feilende process/next
            • `{FormatCount(GetErrorCount(appReport, FailedInstanceCreationRequests))}` feilende instansieringer
            • `{FormatCount(GetMetricCount(appReport, ProcessesStarted))}` påbegynte instanser
            • `{FormatCount(GetMetricCount(appReport, ProcessesEnded))}` fullførte instanser
            """;

    private static string FormatAppVersions(AppReportData appReport)
    {
        List<string> parts = [];
        if (!string.IsNullOrEmpty(appReport.Version))
        {
            parts.Add($"versjon {appReport.Version}");
        }
        if (!string.IsNullOrEmpty(appReport.AppLibVersion))
        {
            parts.Add($"app-bibliotek {appReport.AppLibVersion}");
        }
        return parts.Count > 0 ? $" ({string.Join(", ", parts)})" : "";
    }

    private static double GetErrorCount(AppReportData appReport, string metricName) =>
        appReport.ErrorMetrics.Where(metric => metric.Name == metricName).SelectMany(metric => metric.Counts).Sum();

    private static double GetMetricCount(AppReportData appReport, string metricName) =>
        appReport.Metrics.Where(metric => metric.Name == metricName).SelectMany(metric => metric.Counts).Sum();

    private static string FormatCount(double count) => count.ToString("0.##", CultureInfo.InvariantCulture);
}
