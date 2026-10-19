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

public class AppActivityCollectTests
    : DesignerEndpointsTestsBase<AppActivityCollectTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IScheduler> _schedulerMock = new();
    private readonly Mock<IGiteaClient> _giteaClientMock = new();

    public AppActivityCollectTests(WebApplicationFactory<Program> factory)
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
    public async Task Collect_WithTtdAccess_ShouldTriggerJobForOrg()
    {
        using var response = await HttpClient.GetAsync("/designer/api/v1/skd/internals/app-activity/collect");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        _schedulerMock.Verify(
            s =>
                s.TriggerJob(
                    AppActivityCollectionJobConstants.JobKey,
                    It.Is<JobDataMap>(data => data.GetString(AppActivityCollectionJobConstants.JobDataOrgKey) == "skd"),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task CollectAll_WithTtdAccess_ShouldTriggerJobForAllOrgs()
    {
        using var response = await HttpClient.GetAsync("/designer/api/v1/ttd/internals/app-activity/collect-all");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        _schedulerMock.Verify(
            s =>
                s.TriggerJob(
                    AppActivityCollectionJobConstants.JobKey,
                    It.Is<JobDataMap>(data => !data.ContainsKey(AppActivityCollectionJobConstants.JobDataOrgKey)),
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

        using var response = await HttpClient.GetAsync($"/designer/api/v1/ttd/internals/app-activity/{action}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _schedulerMock.VerifyNoOtherCalls();
    }
}
