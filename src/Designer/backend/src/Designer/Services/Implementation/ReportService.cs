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
    IMemoryCache memoryCache,
    INotificationService notificationService,
    GeneralSettings generalSettings
) : IReportService
{
    private const int MinutesPerDay = 24 * 60;

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

        IReadOnlyList<string> apps = reportMetrics.Apps;

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
                    AppName = app,
                    Metrics = metricsByApp[app],
                    ErrorMetrics =
                    [
                        .. errorMetricsByApp[app]
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
            *{appReport.AppName}*
            • `{FormatCount(GetErrorCount(appReport, FailedProcessNextRequests))}` feilende process/next
            • `{FormatCount(GetErrorCount(appReport, FailedInstanceCreationRequests))}` feilende instansieringer
            • `{FormatCount(GetMetricCount(appReport, ProcessesStarted))}` påbegynte instanser
            • `{FormatCount(GetMetricCount(appReport, ProcessesEnded))}` fullførte instanser
            """;

    private static double GetErrorCount(AppReportData appReport, string metricName) =>
        appReport.ErrorMetrics.Where(metric => metric.Name == metricName).SelectMany(metric => metric.Counts).Sum();

    private static double GetMetricCount(AppReportData appReport, string metricName) =>
        appReport.Metrics.Where(metric => metric.Name == metricName).SelectMany(metric => metric.Counts).Sum();

    private static string FormatCount(double count) => count.ToString("0.##", CultureInfo.InvariantCulture);
}
