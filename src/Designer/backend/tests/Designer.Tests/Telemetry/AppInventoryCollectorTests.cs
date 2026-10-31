#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Telemetry;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using ResourceRegistryOrg = Altinn.ResourceRegistry.Core.Models.Org;

namespace Designer.Tests.Telemetry;

public sealed class AppInventoryCollectorTests : IDisposable
{
    private readonly MetricsRecorder<AppMetrics> _recorder = new(meterFactory => new AppMetrics(meterFactory));
    private readonly Mock<IOrgService> _orgService = new();
    private readonly Mock<IGiteaAppCounter> _appCounter = new();
    private readonly Mock<IEnvironmentsService> _environmentsService = new();
    private readonly Mock<IDeploymentRepository> _deploymentRepository = new();
    private readonly ServiceProvider _services;

    public AppInventoryCollectorTests()
    {
        _services = new ServiceCollection()
            .AddSingleton(_orgService.Object)
            .AddSingleton(_appCounter.Object)
            .AddSingleton(_environmentsService.Object)
            .AddSingleton(_deploymentRepository.Object)
            .BuildServiceProvider();

        _orgService
            .Setup(s => s.GetOrgList(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new OrgList
                {
                    Orgs = new Dictionary<string, ResourceRegistryOrg> { ["ttd"] = new(), ["skd"] = new() },
                }
            );
        _environmentsService
            .Setup(s => s.GetEnvironments())
            .ReturnsAsync([new EnvironmentModel { Name = "tt02" }, new EnvironmentModel { Name = "production" }]);
    }

    [Fact]
    public async Task Collect_CountsTheAppsOfEveryServiceOwner()
    {
        _appCounter
            .Setup(c => c.CountAppsByOrganization(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, int> { ["ttd"] = 7, ["some-test-org"] = 2 });

        await Collect();

        Assert.Equal(
            new Dictionary<string, long> { ["ttd"] = 7, ["skd"] = 0 },
            _recorder
                .Observe(AppMetrics.AppCountMetricName)
                .ToDictionary(count => (string)count.Tags["altinn.service_owner"]!, count => count.Value)
        );
    }

    [Fact]
    public async Task Collect_CountsDeployedAppsInCurrentEnvironmentsOnly()
    {
        _deploymentRepository
            .Setup(r => r.CountDeployedApps(It.IsAny<CancellationToken>()))
            .ReturnsAsync([new("ttd", "production", 3), new("ttd", "at21", 4), new("some-test-org", "tt02", 1)]);

        await Collect();

        RecordedMeasurement count = Assert.Single(_recorder.Observe(AppMetrics.DeployedAppCountMetricName));
        Assert.Equal(3, count.Value);
        Assert.Equal("prod", count.Tags["altinn.environment"]);
    }

    [Fact]
    public async Task Collect_WhenGiteaFails_StopsReportingOnlyTheAppCount()
    {
        _appCounter
            .Setup(c => c.CountAppsByOrganization(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, int> { ["ttd"] = 7 });
        _deploymentRepository
            .Setup(r => r.CountDeployedApps(It.IsAny<CancellationToken>()))
            .ReturnsAsync([new DeployedAppCount("ttd", "tt02", 3)]);
        await Collect();

        _appCounter
            .Setup(c => c.CountAppsByOrganization(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("permission denied for table repository"));
        await Collect();

        Assert.Empty(_recorder.Observe(AppMetrics.AppCountMetricName));
        Assert.Single(_recorder.Observe(AppMetrics.DeployedAppCountMetricName));
    }

    [Fact]
    public async Task Collect_WithoutTheServiceOwnerRegistry_StopsReportingBothCounts()
    {
        _orgService
            .Setup(s => s.GetOrgList(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new System.Net.Http.HttpRequestException("CDN unavailable"));

        await Collect();

        Assert.Empty(_recorder.Observe(AppMetrics.AppCountMetricName));
        Assert.Empty(_recorder.Observe(AppMetrics.DeployedAppCountMetricName));
        _appCounter.VerifyNoOtherCalls();
    }

    private Task Collect() =>
        new AppInventoryCollector(
            _services.GetRequiredService<IServiceScopeFactory>(),
            _recorder.Metrics,
            TimeProvider.System
        ).Collect(CancellationToken.None);

    public void Dispose()
    {
        _services.Dispose();
        _recorder.Dispose();
    }
}
