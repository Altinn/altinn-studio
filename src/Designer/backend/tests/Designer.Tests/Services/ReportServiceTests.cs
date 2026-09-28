using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class ReportServiceTests
{
    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClient = new();
    private readonly Mock<IAppResourcesService> _appResourcesService = new();
    private readonly Mock<INotificationService> _notificationService = new();
    private NotificationPayload _sentPayload;

    public ReportServiceTests()
    {
        _notificationService
            .Setup(service =>
                service.NotifyReportContactPointsAsync(
                    "ttd",
                    AltinnEnvironment.FromName("tt02"),
                    ReportFrequency.Daily,
                    It.IsAny<NotificationPayload>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, AltinnEnvironment, ReportFrequency, NotificationPayload, CancellationToken>(
                (_, _, _, payload, _) => _sentPayload = payload
            );
    }

    [Fact]
    public async Task SendReportAsync_ShouldSendOneTableRowPerAppWithActiveAppsFirst()
    {
        SetupReportMetrics(
            new ReportMetrics
            {
                Apps =
                [
                    new ReportApp { Name = "app-one", Version = "1.4.2" },
                    new ReportApp { Name = "app-two" },
                    new ReportApp { Name = "app-a-idle", Version = "0.1.0" },
                ],
                Metrics =
                [
                    BuildMetric("app-one", "altinn_app_lib_processes_started", [2500, 43]),
                    BuildMetric("app-one", "altinn_app_lib_processes_ended", [7]),
                    BuildMetric("app-two", "altinn_app_lib_processes_started", [12]),
                    BuildMetric("app-two", "altinn_app_lib_processes_ended", [4]),
                    BuildMetric("app-a-idle", "altinn_app_lib_processes_started", []),
                ],
                ErrorMetrics =
                [
                    BuildErrorMetric("app-one", "failed_process_next_requests", [1, 2.5]),
                    BuildErrorMetric("app-one", "failed_instance_creation_requests", [0.5]),
                    BuildErrorMetric("app-two", "failed_instance_creation_requests", [6]),
                ],
            }
        );
        _appResourcesService
            .Setup(service => service.GetApplicationMetadata("ttd", "tt02", "app-one", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ApplicationMetadata("ttd/app-one") { AltinnNugetVersion = "8.5.3.108" });
        _appResourcesService
            .Setup(service => service.GetApplicationMetadata("ttd", "tt02", "app-two", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("app is unreachable"));
        _appResourcesService
            .Setup(service =>
                service.GetApplicationMetadata("ttd", "tt02", "app-a-idle", It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(new ApplicationMetadata("ttd/app-a-idle"));

        await CreateService().SendReportAsync("ttd", "tt02", ReportFrequency.Daily);

        Assert.NotNull(_sentPayload);
        Assert.Equal("Altinn Studio - daglig rapport", _sentPayload.Title);
        Assert.Contains(_sentPayload.Fields, field => field.Label == "Periode" && field.Value.Contains(" – "));
        Assert.Equal("", _sentPayload.Body);
        Assert.NotNull(_sentPayload.Table);
        Assert.Equal(
            [
                "App",
                "Versjon",
                "App-bibliotek",
                "Feilende process/next",
                "Feilende instansieringer",
                "Påbegynte instanser",
                "Fullførte instanser",
            ],
            _sentPayload.Table.Headers
        );
        Assert.Collection(
            _sentPayload.Table.Rows,
            row => Assert.Equal(["app-one", "1.4.2", "8.5.3", "3,5", "0,5", NorwegianNumber(2543), "7"], row),
            row => Assert.Equal(["app-two", null, null, "0", "6", "12", "4"], row),
            row => Assert.Equal(["app-a-idle", "0.1.0", null, "0", "0", "0", "0"], row)
        );
    }

    [Fact]
    public async Task SendReportAsync_WhenNoAppsAreDeployed_ShouldSaySoInsteadOfSendingAnEmptyTable()
    {
        SetupReportMetrics(new ReportMetrics());

        await CreateService().SendReportAsync("ttd", "tt02", ReportFrequency.Daily);

        Assert.NotNull(_sentPayload);
        Assert.Equal("Ingen publiserte apper ble funnet i miljøet.", _sentPayload.Body);
        Assert.Null(_sentPayload.Table);
    }

    // The Norwegian group separator is a no-break space whose exact code point depends on the ICU version.
    private static string NorwegianNumber(int value) => value.ToString("#,0", CultureInfo.GetCultureInfo("nb-NO"));

    private ReportService CreateService() =>
        new(_runtimeGatewayClient.Object, _appResourcesService.Object, _notificationService.Object);

    private void SetupReportMetrics(ReportMetrics reportMetrics) =>
        _runtimeGatewayClient
            .Setup(client =>
                client.GetReportMetricsAsync(
                    "ttd",
                    AltinnEnvironment.FromName("tt02"),
                    24 * 60,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(reportMetrics);

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
