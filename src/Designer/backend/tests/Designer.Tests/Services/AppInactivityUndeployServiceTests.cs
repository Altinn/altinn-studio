using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.AppSettings;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class AppInactivityUndeployServiceTests
{
    private readonly Mock<IEnvironmentsService> _environmentsService = new();
    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClient = new();
    private readonly Mock<IAppSettingsService> _appSettingsService = new();

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenStatusIsUnavailable_ShouldReturnNoCandidates()
    {
        var service = CreateService();
        _appSettingsService.Setup(s => s.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new AppSettingsEntity { Org = "ttd", App = "app1", UndeployOnInactivity = true }
            ]);

        _runtimeGatewayClient.Setup(c => c.GetAppDeployments("ttd", It.IsAny<AltinnEnvironment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new AppDeployment("ttd", "at23", "app1", "dev", "1", "v1")]);

        _runtimeGatewayClient.Setup(c => c.GetAppActivityMetricsAsync("ttd", It.IsAny<AltinnEnvironment>(), 7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AppActivityMetricsResponse("unavailable", new Dictionary<string, double>(), 7, DateTimeOffset.UtcNow));

        var result = await service.GetAppsForDecommissioningAsync(new InactivityUndeployEvaluationOptions
        {
            Org = "ttd",
            Environment = "at23"
        });

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenInactive_ShouldReturnCandidate()
    {
        var service = CreateService();
        _appSettingsService.Setup(s => s.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new AppSettingsEntity { Org = "ttd", App = "app1", UndeployOnInactivity = true }
            ]);

        _runtimeGatewayClient.Setup(c => c.GetAppDeployments("ttd", It.IsAny<AltinnEnvironment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new AppDeployment("ttd", "at23", "app1", "dev", "1", "v1")]);

        _runtimeGatewayClient.Setup(c => c.GetAppActivityMetricsAsync("ttd", It.IsAny<AltinnEnvironment>(), 7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AppActivityMetricsResponse("ok", new Dictionary<string, double>(), 7, DateTimeOffset.UtcNow));

        var result = await service.GetAppsForDecommissioningAsync(new InactivityUndeployEvaluationOptions
        {
            Org = "ttd",
            Environment = "at23"
        });

        var candidate = Assert.Single(result);
        Assert.Equal("ttd", candidate.Org);
        Assert.Equal("app1", candidate.App);
        Assert.Equal("at23", candidate.Environment);
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenAppIsActive_ShouldReturnNoCandidates()
    {
        var service = CreateService();
        _appSettingsService.Setup(s => s.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new AppSettingsEntity { Org = "ttd", App = "app1", UndeployOnInactivity = true }
            ]);

        _runtimeGatewayClient.Setup(c => c.GetAppDeployments("ttd", It.IsAny<AltinnEnvironment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new AppDeployment("ttd", "at23", "app1", "dev", "1", "v1")]);

        _runtimeGatewayClient.Setup(c => c.GetAppActivityMetricsAsync("ttd", It.IsAny<AltinnEnvironment>(), 7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AppActivityMetricsResponse("ok", new Dictionary<string, double> { ["app1"] = 1 }, 7, DateTimeOffset.UtcNow));

        var result = await service.GetAppsForDecommissioningAsync(new InactivityUndeployEvaluationOptions
        {
            Org = "ttd",
            Environment = "at23"
        });

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenOrgHasNoOptedInApps_ShouldSkipExternalCalls()
    {
        var service = CreateService();
        _appSettingsService.Setup(s => s.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new AppSettingsEntity { Org = "other", App = "app1", UndeployOnInactivity = true }
            ]);

        var result = await service.GetAppsForDecommissioningAsync(new InactivityUndeployEvaluationOptions
        {
            Org = "ttd"
        });

        Assert.Empty(result);
        _environmentsService.Verify(
            e => e.GetOrganizationEnvironments(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        _runtimeGatewayClient.Verify(c => c.GetAppDeployments(It.IsAny<string>(), It.IsAny<AltinnEnvironment>(), It.IsAny<CancellationToken>()), Times.Never);
        _runtimeGatewayClient.Verify(c => c.GetAppActivityMetricsAsync(It.IsAny<string>(), It.IsAny<AltinnEnvironment>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_ShouldPropagateCancellationTokenToEnvironmentLookup()
    {
        var service = CreateService();
        _appSettingsService.Setup(s => s.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new AppSettingsEntity { Org = "ttd", App = "app1", UndeployOnInactivity = true }
            ]
        );

        _runtimeGatewayClient.Setup(c => c.GetAppDeployments("ttd", It.IsAny<AltinnEnvironment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new AppDeployment("ttd", "at23", "app1", "dev", "1", "v1")]);

        _runtimeGatewayClient.Setup(c => c.GetAppActivityMetricsAsync("ttd", It.IsAny<AltinnEnvironment>(), 7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AppActivityMetricsResponse("ok", new Dictionary<string, double>(), 7, DateTimeOffset.UtcNow));

        using var cts = new CancellationTokenSource();

        var result = await service.GetAppsForDecommissioningAsync(
            new InactivityUndeployEvaluationOptions { Org = "ttd" },
            cts.Token
        );

        Assert.Single(result);
        _environmentsService.Verify(
            e => e.GetOrganizationEnvironments("ttd", cts.Token),
            Times.Once
        );
    }

    private AppInactivityUndeployService CreateService()
    {
        _environmentsService.Setup(
            e => e.GetOrganizationEnvironments(It.IsAny<string>(), It.IsAny<CancellationToken>())
        )
            .ReturnsAsync([new EnvironmentModel { Name = "at23", PlatformUrl = "https://platform.at23.altinn.cloud" }]);

        return new AppInactivityUndeployService(
            _environmentsService.Object,
            _runtimeGatewayClient.Object,
            _appSettingsService.Object
        );
    }
}
