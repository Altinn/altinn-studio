using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Reports;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Designer.Tests.Telemetry;
using Microsoft.Extensions.Logging;
using Moq;
using Quartz;
using Xunit;

namespace Designer.Tests.Scheduling;

public class PeriodicReportJobTests : IDisposable
{
    private readonly Mock<IContactPointsRepository> _contactPointsRepository = new();
    private readonly Mock<IReportService> _reportService = new();
    private readonly Mock<ILogger<PeriodicReportJob>> _logger = new();
    private readonly NotificationMetricsRecorder _metrics = new();

    public void Dispose() => _metrics.Dispose();

    [Fact]
    public async Task Execute_SendsReportForEachTargetWithTheTriggerFrequency()
    {
        _contactPointsRepository
            .Setup(repository =>
                repository.GetReportTargetsAsync(ReportFrequency.Weekly, It.IsAny<CancellationToken>())
            )
            .ReturnsAsync([new ReportTarget("skd", "prod"), new ReportTarget("ttd", "tt02")]);

        await CreateJob().Execute(CreateContext(ReportFrequency.Weekly));

        _reportService.Verify(
            service => service.SendReportAsync("skd", "prod", ReportFrequency.Weekly, It.IsAny<CancellationToken>()),
            Times.Once
        );
        _reportService.Verify(
            service => service.SendReportAsync("ttd", "tt02", ReportFrequency.Weekly, It.IsAny<CancellationToken>()),
            Times.Once
        );
        _reportService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_WhenOneReportFails_LogsTheFailureAndSendsTheRemainingReports()
    {
        var failure = new HttpRequestException("gateway unavailable");
        _contactPointsRepository
            .Setup(repository => repository.GetReportTargetsAsync(ReportFrequency.Daily, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new ReportTarget("skd", "prod"), new ReportTarget("ttd", "tt02")]);
        _reportService
            .Setup(service =>
                service.SendReportAsync("skd", "prod", ReportFrequency.Daily, It.IsAny<CancellationToken>())
            )
            .ThrowsAsync(failure);

        await CreateJob().Execute(CreateContext(ReportFrequency.Daily));

        _reportService.Verify(
            service => service.SendReportAsync("ttd", "tt02", ReportFrequency.Daily, It.IsAny<CancellationToken>()),
            Times.Once
        );
        _logger.Verify(
            logger =>
                logger.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((state, _) => state.ToString().Contains("skd in prod")),
                    failure,
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_CountsEachReportWithItsTargetAndOutcome()
    {
        _contactPointsRepository
            .Setup(repository => repository.GetReportTargetsAsync(ReportFrequency.Daily, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new ReportTarget("skd", "production"), new ReportTarget("ttd", "tt02")]);
        _reportService
            .Setup(service =>
                service.SendReportAsync("skd", "production", ReportFrequency.Daily, It.IsAny<CancellationToken>())
            )
            .ThrowsAsync(new HttpRequestException("gateway unavailable"));

        await CreateJob().Execute(CreateContext(ReportFrequency.Daily));

        IReadOnlyList<RecordedMeasurement> reports = _metrics.Measurements(
            NotificationMetrics.PeriodicReportsMetricName
        );
        Assert.Equal(2, reports.Count);
        Assert.Equivalent(
            new Dictionary<string, object>
            {
                ["altinn.designer.periodic_report.frequency"] = "daily",
                ["altinn.service_owner"] = "skd",
                ["altinn.environment"] = "prod",
                ["error.type"] = "System.Net.Http.HttpRequestException",
            },
            Assert.Single(reports, report => Equals(report.Tags["altinn.service_owner"], "skd")).Tags,
            strict: true
        );
        Assert.Equivalent(
            new Dictionary<string, object>
            {
                ["altinn.designer.periodic_report.frequency"] = "daily",
                ["altinn.service_owner"] = "ttd",
                ["altinn.environment"] = "tt02",
            },
            Assert.Single(reports, report => Equals(report.Tags["altinn.service_owner"], "ttd")).Tags,
            strict: true
        );
    }

    [Fact]
    public async Task Execute_WhenCancelled_StopsAndPropagatesCancellation()
    {
        using var cancellationTokenSource = new CancellationTokenSource();
        _contactPointsRepository
            .Setup(repository => repository.GetReportTargetsAsync(ReportFrequency.Daily, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new ReportTarget("skd", "prod"), new ReportTarget("ttd", "tt02")]);
        _reportService
            .Setup(service =>
                service.SendReportAsync("skd", "prod", ReportFrequency.Daily, It.IsAny<CancellationToken>())
            )
            .Callback(cancellationTokenSource.Cancel)
            .ThrowsAsync(new OperationCanceledException());

        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            CreateJob().Execute(CreateContext(ReportFrequency.Daily, cancellationTokenSource.Token))
        );

        _reportService.Verify(
            service =>
                service.SendReportAsync("ttd", "tt02", It.IsAny<ReportFrequency>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        Assert.Empty(_metrics.Measurements(NotificationMetrics.PeriodicReportsMetricName));
    }

    private PeriodicReportJob CreateJob() =>
        new(_contactPointsRepository.Object, _reportService.Object, _metrics.Metrics, _logger.Object);

    private static IJobExecutionContext CreateContext(
        ReportFrequency frequency,
        CancellationToken cancellationToken = default
    )
    {
        var jobDataMap = new JobDataMap();
        jobDataMap[PeriodicReportJobConstants.FrequencyKey] = frequency.ToString();

        var context = new Mock<IJobExecutionContext>();
        context.SetupGet(c => c.MergedJobDataMap).Returns(jobDataMap);
        context.SetupGet(c => c.CancellationToken).Returns(cancellationToken);
        return context.Object;
    }
}
