using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class ReportServiceTests
{
    [Fact]
    public async Task GenerateReportPdfAsync_ShouldIncludePerAppMetricSummaryInNotification()
    {
        var runtimeGatewayClient = new Mock<IRuntimeGatewayClient>();
        var notificationService = new Mock<INotificationService>();
        var pdf = new byte[] { 1, 2, 3 };
        NotificationPayload capturedPayload = null;
        byte[] capturedPdfBytes = null;

        runtimeGatewayClient
            .Setup(client =>
                client.GetReportMetricsAsync(
                    "ttd",
                    AltinnEnvironment.FromName("tt02"),
                    24 * 60,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(BuildReportMetrics());
        runtimeGatewayClient
            .Setup(client =>
                client.GeneratePdfAsync(
                    "ttd",
                    AltinnEnvironment.FromName("tt02"),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(pdf);
        notificationService
            .Setup(service =>
                service.NotifyReportContactPointsAsync(
                    "ttd",
                    AltinnEnvironment.FromName("tt02"),
                    ReportFrequency.Daily,
                    It.IsAny<NotificationPayload>(),
                    It.IsAny<byte[]>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, AltinnEnvironment, ReportFrequency, NotificationPayload, byte[], CancellationToken>(
                (_, _, _, payload, pdfBytes, _) =>
                {
                    capturedPayload = payload;
                    capturedPdfBytes = pdfBytes;
                }
            );

        using var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var service = new ReportService(
            runtimeGatewayClient.Object,
            memoryCache,
            notificationService.Object,
            new GeneralSettings { HostName = "localhost" }
        );

        await service.GenerateReportPdfAsync("ttd", "tt02", ReportFrequency.Daily);

        Assert.Same(pdf, capturedPdfBytes);
        Assert.NotNull(capturedPayload);
        Assert.Equal("Altinn Studio - periodisk rapport", capturedPayload.Title);
        Assert.Contains(capturedPayload.Fields, field => field.Label == "Periode" && field.Value.Contains(" – "));
        Assert.Equal(
            """
            *app-one*
            • `3.5` feilende process/next
            • `0.5` feilende instansieringer
            • `2543` påbegynte instanser
            • `7` fullførte instanser

            *app-two*
            • `0` feilende process/next
            • `6` feilende instansieringer
            • `12` påbegynte instanser
            • `4` fullførte instanser
            """,
            capturedPayload.Body
        );
    }

    private static ReportMetrics BuildReportMetrics() =>
        new()
        {
            Apps = ["app-one", "app-two"],
            Metrics =
            [
                BuildMetric("app-one", "altinn_app_lib_processes_started", [2500, 43]),
                BuildMetric("app-one", "altinn_app_lib_processes_ended", [7]),
                BuildMetric("app-two", "altinn_app_lib_processes_started", [12]),
                BuildMetric("app-two", "altinn_app_lib_processes_ended", [4]),
            ],
            ErrorMetrics =
            [
                BuildErrorMetric("app-one", "failed_process_next_requests", [1, 2.5]),
                BuildErrorMetric("app-one", "failed_instance_creation_requests", [0.5]),
                BuildErrorMetric("app-two", "failed_instance_creation_requests", [6]),
            ],
        };

    private static Metric BuildMetric(string appName, string name, IEnumerable<double> counts) =>
        new()
        {
            AppName = appName,
            Name = name,
            Timestamps = [],
            Counts = counts,
            BucketSize = 60,
        };

    private static AllAppsErrorMetric BuildErrorMetric(string appName, string name, IEnumerable<double> counts) =>
        new()
        {
            AppName = appName,
            Name = name,
            Timestamps = [],
            Counts = counts,
            BucketSize = 60,
            LogsUrl = new Uri("https://example.com/logs"),
        };
}
