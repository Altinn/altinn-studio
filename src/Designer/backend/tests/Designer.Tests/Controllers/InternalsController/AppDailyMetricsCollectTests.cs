using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Scheduling;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Quartz;
using Xunit;

namespace Designer.Tests.Controllers.InternalsController;

public class AppDailyMetricsCollectTests
    : DesignerEndpointsTestsBase<AppDailyMetricsCollectTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IScheduler> _schedulerMock = new();
    private readonly Mock<IGiteaClient> _giteaClientMock = new();

    public AppDailyMetricsCollectTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        var schedulerFactoryMock = new Mock<ISchedulerFactory>();
        schedulerFactoryMock
            .Setup(f => f.GetScheduler(It.IsAny<CancellationToken>()))
            .ReturnsAsync(_schedulerMock.Object);
        services.RemoveAll<ISchedulerFactory>();
        services.AddSingleton(schedulerFactoryMock.Object);
        services.RemoveAll<IGiteaClient>();
        _giteaClientMock.Setup(c => c.GetUserOrganizations()).ReturnsAsync([new Organization { Username = "ttd" }]);
        services.AddSingleton(_giteaClientMock.Object);
    }

    [Fact]
    public async Task Collect_WithTtdAccess_ShouldTriggerJobForOrgAndYesterday()
    {
        using var response = await HttpClient.GetAsync("/designer/api/v1/skd/internals/app-daily-metrics/collect");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        _schedulerMock.Verify(
            s =>
                s.TriggerJob(
                    AppDailyMetricsCollectionJobConstants.JobKey,
                    It.Is<JobDataMap>(data =>
                        data.GetString(AppDailyMetricsCollectionJobConstants.JobDataOrgKey) == "skd"
                        && !data.ContainsKey(AppDailyMetricsCollectionJobConstants.JobDataDateKey)
                    ),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Collect_WithDate_ShouldTriggerJobForThatDay()
    {
        using var response = await HttpClient.GetAsync(
            "/designer/api/v1/skd/internals/app-daily-metrics/collect?date=2026-10-01"
        );

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        _schedulerMock.Verify(
            s =>
                s.TriggerJob(
                    AppDailyMetricsCollectionJobConstants.JobKey,
                    It.Is<JobDataMap>(data =>
                        data.GetString(AppDailyMetricsCollectionJobConstants.JobDataOrgKey) == "skd"
                        && data.GetString(AppDailyMetricsCollectionJobConstants.JobDataDateKey) == "2026-10-01"
                    ),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Collect_WithInvalidDate_ShouldReturnBadRequest()
    {
        using var response = await HttpClient.GetAsync(
            "/designer/api/v1/skd/internals/app-daily-metrics/collect?date=yesterday"
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _schedulerMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CollectAll_WithTtdAccess_ShouldTriggerJobForAllOrgs()
    {
        using var response = await HttpClient.GetAsync(
            "/designer/api/v1/ttd/internals/app-daily-metrics/collect-all?date=2026-10-01"
        );

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        _schedulerMock.Verify(
            s =>
                s.TriggerJob(
                    AppDailyMetricsCollectionJobConstants.JobKey,
                    It.Is<JobDataMap>(data =>
                        !data.ContainsKey(AppDailyMetricsCollectionJobConstants.JobDataOrgKey)
                        && data.GetString(AppDailyMetricsCollectionJobConstants.JobDataDateKey) == "2026-10-01"
                    ),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Theory]
    [InlineData("collect")]
    [InlineData("collect-all")]
    public async Task Collect_WhenUserHasNoTtdAccess_ShouldReturnForbidden(string action)
    {
        _ = HttpClient;
        _giteaClientMock
            .Setup(c => c.GetUserOrganizations())
            .ReturnsAsync([new Organization { Username = "other-org" }]);

        using var response = await HttpClient.GetAsync($"/designer/api/v1/ttd/internals/app-daily-metrics/{action}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _schedulerMock.VerifyNoOtherCalls();
    }
}
