using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Models.Reports;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class ReportServiceTests
{
    [Fact]
    public async Task GenerateReportPdfAsync_ShouldIncludePerAppMetricSummaryInNotification()
    {
        var runtimeGatewayClient = new Mock<IRuntimeGatewayClient>();
        var appResourcesService = new Mock<IAppResourcesService>();
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

        appResourcesService
            .Setup(service => service.GetApplicationMetadata("ttd", "tt02", "app-one", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ApplicationMetadata("ttd/app-one") { AltinnNugetVersion = "8.5.3.108" });
        appResourcesService
            .Setup(service => service.GetApplicationMetadata("ttd", "tt02", "app-two", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("app is unreachable"));

        var service = CreateService(
            runtimeGatewayClient.Object,
            appResourcesService.Object,
            notificationService.Object
        );

        await service.GenerateReportPdfAsync("ttd", "tt02", ReportFrequency.Daily);

        Assert.Same(pdf, capturedPdfBytes);
        Assert.NotNull(capturedPayload);
        Assert.Equal("Altinn Studio - periodisk rapport", capturedPayload.Title);
        Assert.Contains(capturedPayload.Fields, field => field.Label == "Periode" && field.Value.Contains(" – "));
        Assert.Equal(
            """
            *app-one* (versjon 1.4.2, app-bibliotek 8.5.3)
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

    [Fact]
    public async Task GetReportDataAsync_ShouldServeReportDataOnlyWhileThePdfIsRendered()
    {
        var runtimeGatewayClient = new Mock<IRuntimeGatewayClient>();
        ReportService service = null;
        string token = null;
        ReportData dataDuringRendering = null;
        ReportData dataForOtherEnvironment = null;

        runtimeGatewayClient
            .Setup(client =>
                client.GetReportMetricsAsync(
                    "ttd",
                    AltinnEnvironment.FromName("tt02"),
                    It.IsAny<int>(),
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
            .Returns<string, AltinnEnvironment, string, CancellationToken>(
                async (_, _, renderUrl, cancellationToken) =>
                {
                    token = QueryHelpers.ParseQuery(new Uri(renderUrl).Query)["token"];
                    dataDuringRendering = await service.GetReportDataAsync("ttd", "tt02", token, cancellationToken);
                    dataForOtherEnvironment = await service.GetReportDataAsync(
                        "ttd",
                        "production",
                        token,
                        cancellationToken
                    );
                    return [1, 2, 3];
                }
            );
        service = CreateService(
            runtimeGatewayClient.Object,
            new Mock<IAppResourcesService>().Object,
            new Mock<INotificationService>().Object
        );

        await service.GenerateReportPdfAsync("ttd", "tt02", ReportFrequency.Daily);

        Assert.NotNull(dataDuringRendering);
        Assert.Equal("ttd", dataDuringRendering.Org);
        Assert.Equal("tt02", dataDuringRendering.Environment);
        Assert.Equal(["app-one", "app-two"], dataDuringRendering.Apps.Select(app => app.AppName).Order());
        Assert.Null(dataForOtherEnvironment);
        Assert.Null(await service.GetReportDataAsync("ttd", "tt02", token));
    }

    [Fact]
    public async Task GenerateReportPdfAsync_WhenPdfGenerationFails_ShouldRemoveReportData()
    {
        var runtimeGatewayClient = new Mock<IRuntimeGatewayClient>();
        string token = null;

        runtimeGatewayClient
            .Setup(client =>
                client.GetReportMetricsAsync(
                    "ttd",
                    AltinnEnvironment.FromName("tt02"),
                    It.IsAny<int>(),
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
            .Callback<string, AltinnEnvironment, string, CancellationToken>(
                (_, _, renderUrl, _) => token = QueryHelpers.ParseQuery(new Uri(renderUrl).Query)["token"]
            )
            .ThrowsAsync(new HttpRequestException("pdf generation failed"));
        var service = CreateService(
            runtimeGatewayClient.Object,
            new Mock<IAppResourcesService>().Object,
            new Mock<INotificationService>().Object
        );

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            service.GenerateReportPdfAsync("ttd", "tt02", ReportFrequency.Daily)
        );

        Assert.NotNull(token);
        Assert.Null(await service.GetReportDataAsync("ttd", "tt02", token));
    }

    private static ReportService CreateService(
        IRuntimeGatewayClient runtimeGatewayClient,
        IAppResourcesService appResourcesService,
        INotificationService notificationService,
        IDistributedCache distributedCache = null
    ) =>
        new(
            runtimeGatewayClient,
            appResourcesService,
            distributedCache ?? CreateDistributedCache(),
            notificationService,
            new GeneralSettings { HostName = "localhost" }
        );

    private static MemoryDistributedCache CreateDistributedCache() =>
        new(Options.Create(new MemoryDistributedCacheOptions()));

    private static ReportMetrics BuildReportMetrics() =>
        new()
        {
            Apps = [new ReportApp { Name = "app-one", Version = "1.4.2" }, new ReportApp { Name = "app-two" }],
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
