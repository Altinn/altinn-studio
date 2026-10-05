using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Reports;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;
using Quartz;
using Xunit;

namespace Designer.Tests.Scheduling;

public class PeriodicReportJobTests
{
    private readonly Mock<IContactPointsRepository> _contactPointsRepository = new();
    private readonly Mock<IReportService> _reportService = new();

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
    public async Task Execute_WhenOneReportFails_SendsTheRemainingReports()
    {
        _contactPointsRepository
            .Setup(repository => repository.GetReportTargetsAsync(ReportFrequency.Daily, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new ReportTarget("skd", "prod"), new ReportTarget("ttd", "tt02")]);
        _reportService
            .Setup(service =>
                service.SendReportAsync("skd", "prod", ReportFrequency.Daily, It.IsAny<CancellationToken>())
            )
            .ThrowsAsync(new HttpRequestException("gateway unavailable"));

        await CreateJob().Execute(CreateContext(ReportFrequency.Daily));

        _reportService.Verify(
            service => service.SendReportAsync("ttd", "tt02", ReportFrequency.Daily, It.IsAny<CancellationToken>()),
            Times.Once
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
    }

    private PeriodicReportJob CreateJob() => new(_contactPointsRepository.Object, _reportService.Object);

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
