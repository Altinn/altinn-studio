using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppActivity;
using Altinn.Studio.Designer.Repository.Models.AppSettings;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class AppInactivityUndeployServiceTests
{
    private const string Org = "ttd";
    private const string Environment = "at23";
    private const int DefaultPeriodDays = 30;
    private static readonly DateTimeOffset s_now = new(2026, 10, 15, 0, 0, 0, TimeSpan.Zero);

    private readonly Mock<IEnvironmentsService> _environmentsService = new();
    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClient = new();
    private readonly Mock<IAppSettingsService> _appSettingsService = new();
    private readonly Mock<IOrgSettingsService> _orgSettingsService = new();
    private readonly Mock<IAppActivityRepository> _appActivityRepository = new();
    private readonly Mock<IDeploymentRepository> _deploymentRepository = new();

    private InactivityUndeploySettings _orgSettings = InactivityUndeploySettingsResolver.SystemDefault;
    private readonly List<AppSettingsEntity> _appSettings = [];
    private readonly List<AppActivityRecord> _activity = [];
    private readonly Dictionary<string, DateTimeOffset> _latestDeploys = new();

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenInactiveWithDefaults_ShouldReturnCandidate()
    {
        SetupDeployedApps("app1");
        AddActivity("app1");

        var result = await Evaluate();

        var candidate = Assert.Single(result);
        Assert.Equal(Org, candidate.Org);
        Assert.Equal("app1", candidate.App);
        Assert.Equal(Environment, candidate.Environment);
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenAppIsDisabled_ShouldNotReturnIt()
    {
        SetupDeployedApps("app1", "app2");
        AddActivity("app1");
        AddActivity("app2");
        AddAppSettings("app1", undeployOnInactivity: false);

        var result = await Evaluate();

        Assert.Equal(["app2"], result.Select(c => c.App));
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenOrgIsDisabled_ShouldOnlyReturnAppsThatOptIn()
    {
        _orgSettings = new InactivityUndeploySettings(false, DefaultPeriodDays);
        SetupDeployedApps("app1", "app2");
        AddActivity("app1");
        AddActivity("app2");
        AddAppSettings("app2", undeployOnInactivity: true);

        var result = await Evaluate();

        Assert.Equal(["app2"], result.Select(c => c.App));
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenOrgIsDisabledWithoutOptIns_ShouldSkipExternalCalls()
    {
        _orgSettings = new InactivityUndeploySettings(false, DefaultPeriodDays);
        AddAppSettings("app1", undeployOnInactivity: null, inactivityPeriodDays: 10);

        var result = await Evaluate(environment: null);

        Assert.Empty(result);
        _environmentsService.Verify(
            e => e.GetOrganizationEnvironments(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        _runtimeGatewayClient.Verify(
            c => c.GetAppDeployments(It.IsAny<string>(), It.IsAny<AltinnEnvironment>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        _appActivityRepository.Verify(
            r => r.GetForEnvironmentAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenAppIsNotInLiveDeployments_ShouldNotReturnIt()
    {
        SetupDeployedApps("app1");
        AddActivity("app1");
        AddActivity("undeployed-app");

        var result = await Evaluate();

        Assert.Equal(["app1"], result.Select(c => c.App));
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenAppHasNoActivityRow_ShouldNotReturnIt()
    {
        SetupDeployedApps("app1");

        var result = await Evaluate();

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenActivityIsStale_ShouldNotReturnIt()
    {
        SetupDeployedApps("fresh", "stale");
        AddActivity("fresh", lastCollectedAt: s_now.AddDays(-2));
        AddActivity("stale", lastCollectedAt: s_now.AddDays(-2).AddMinutes(-1));

        var result = await Evaluate();

        Assert.Equal(["fresh"], result.Select(c => c.App));
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenPeriodIsNotFullyObserved_ShouldNotReturnIt()
    {
        SetupDeployedApps("observed", "not-observed");
        AddActivity("observed", observedSince: s_now.AddDays(-DefaultPeriodDays));
        AddActivity("not-observed", observedSince: s_now.AddDays(-DefaultPeriodDays).AddMinutes(1));

        var result = await Evaluate();

        Assert.Equal(["observed"], result.Select(c => c.App));
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenWrittenWithinPeriod_ShouldNotReturnIt()
    {
        SetupDeployedApps("written-before", "written-within");
        AddActivity("written-before", lastWriteAt: s_now.AddDays(-DefaultPeriodDays).AddMinutes(-1));
        AddActivity("written-within", lastWriteAt: s_now.AddDays(-DefaultPeriodDays));

        var result = await Evaluate();

        Assert.Equal(["written-before"], result.Select(c => c.App));
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenDeployedWithinPeriod_ShouldNotReturnIt()
    {
        SetupDeployedApps("deployed-before", "deployed-within");
        AddActivity("deployed-before");
        AddActivity("deployed-within");
        _latestDeploys["deployed-before"] = s_now.AddDays(-DefaultPeriodDays).AddMinutes(-1);
        _latestDeploys["deployed-within"] = s_now.AddDays(-DefaultPeriodDays);

        var result = await Evaluate();

        Assert.Equal(["deployed-before"], result.Select(c => c.App));
        _deploymentRepository.Verify(
            r =>
                r.GetLatestDeployTimes(
                    Org,
                    Environment,
                    s_now.AddDays(-DefaultPeriodDays),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_ShouldUseEachAppsEffectivePeriod()
    {
        _orgSettings = new InactivityUndeploySettings(true, 60);
        SetupDeployedApps("org-period", "app-period");
        var lastWrite = s_now.AddDays(-45);
        AddActivity("org-period", lastWriteAt: lastWrite, observedSince: s_now.AddDays(-90));
        AddActivity("app-period", lastWriteAt: lastWrite, observedSince: s_now.AddDays(-90));
        AddAppSettings("app-period", undeployOnInactivity: null, inactivityPeriodDays: 40);

        var result = await Evaluate();

        Assert.Equal(["app-period"], result.Select(c => c.App));
        _deploymentRepository.Verify(
            r => r.GetLatestDeployTimes(Org, Environment, s_now.AddDays(-40), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_ShouldIgnoreEnvironmentSpecificAppSettings()
    {
        SetupDeployedApps("app1");
        AddActivity("app1");
        _appSettings.Add(
            new AppSettingsEntity
            {
                Org = Org,
                App = "app1",
                Environment = Environment,
                UndeployOnInactivity = false,
            }
        );

        var result = await Evaluate();

        Assert.Single(result);
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_WhenDeploymentsFetchFails_ShouldSkipEnvironment()
    {
        _runtimeGatewayClient
            .Setup(c => c.GetAppDeployments(Org, It.IsAny<AltinnEnvironment>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("gateway down"));

        var spans = await CaptureSpans(() => Evaluate());

        var environmentSpan = GetEnvironmentSpan(spans);
        Assert.Equal(
            "deployments_fetch_failed",
            environmentSpan.GetTagItem("altinn.designer.inactivity_undeploy.evaluation_skip_reason")
        );
        Assert.Equal(ActivityStatusCode.Error, environmentSpan.Status);
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_ShouldPropagateCancellationTokenToEnvironmentLookup()
    {
        SetupDeployedApps("app1");
        AddActivity("app1");
        using var cts = new CancellationTokenSource();

        var result = await CreateService()
            .GetAppsForDecommissioningAsync(new InactivityUndeployEvaluationOptions { Org = Org }, cts.Token);

        Assert.Single(result);
        _environmentsService.Verify(e => e.GetOrganizationEnvironments(Org, cts.Token), Times.Once);
    }

    [Fact]
    public async Task GetAppsForDecommissioningAsync_ShouldCountEachSkipReasonOnEnvironmentSpan()
    {
        SetupDeployedApps("disabled", "no-row", "stale", "not-observed", "active", "deployed", "inactive");
        AddAppSettings("disabled", undeployOnInactivity: false);
        AddActivity("disabled");
        AddActivity("stale", lastCollectedAt: s_now.AddDays(-3));
        AddActivity("not-observed", observedSince: s_now.AddDays(-10));
        AddActivity("active", lastWriteAt: s_now.AddDays(-1));
        AddActivity("deployed");
        AddActivity("inactive");
        _latestDeploys["deployed"] = s_now.AddDays(-1);

        var spans = await CaptureSpans(() => Evaluate());

        var environmentSpan = GetEnvironmentSpan(spans);
        Assert.Null(environmentSpan.GetTagItem("altinn.service_owner"));
        Assert.Equal(Environment, environmentSpan.GetTagItem("altinn.environment"));
        Assert.Equal(7, environmentSpan.GetTagItem("altinn.designer.inactivity_undeploy.deployed_app_count"));
        Assert.Equal(1, environmentSpan.GetTagItem("altinn.designer.inactivity_undeploy.disabled_app_count"));
        Assert.Equal(2, environmentSpan.GetTagItem("altinn.designer.inactivity_undeploy.not_fresh_app_count"));
        Assert.Equal(1, environmentSpan.GetTagItem("altinn.designer.inactivity_undeploy.not_fully_observed_app_count"));
        Assert.Equal(1, environmentSpan.GetTagItem("altinn.designer.inactivity_undeploy.active_app_count"));
        Assert.Equal(1, environmentSpan.GetTagItem("altinn.designer.inactivity_undeploy.recently_deployed_app_count"));
        Assert.Equal(1, environmentSpan.GetTagItem("altinn.designer.inactivity_undeploy.candidate_count"));
        Assert.Null(environmentSpan.GetTagItem("altinn.designer.inactivity_undeploy.evaluation_skip_reason"));
        Assert.Empty(environmentSpan.Events);
    }

    private Task<IReadOnlyList<InactivityUndeployCandidate>> Evaluate(string environment = Environment) =>
        CreateService()
            .GetAppsForDecommissioningAsync(
                new InactivityUndeployEvaluationOptions { Org = Org, Environment = environment }
            );

    private void SetupDeployedApps(params string[] apps)
    {
        _runtimeGatewayClient
            .Setup(c => c.GetAppDeployments(Org, It.IsAny<AltinnEnvironment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(apps.Select(app => new AppDeployment(Org, Environment, app, "dev", "1", "v1")).ToList());
    }

    /// <summary>
    /// Adds an activity row that passes every rule unless overridden: freshly collected, observed for longer
    /// than the default period and never written.
    /// </summary>
    private void AddActivity(
        string app,
        DateTimeOffset? lastWriteAt = null,
        DateTimeOffset? observedSince = null,
        DateTimeOffset? lastCollectedAt = null
    )
    {
        _activity.Add(
            new AppActivityRecord
            {
                App = app,
                LastWriteAt = lastWriteAt,
                ObservedSince = observedSince ?? s_now.AddDays(-(DefaultPeriodDays + 1)),
                LastCollectedAt = lastCollectedAt ?? s_now.AddHours(-22),
            }
        );
    }

    private void AddAppSettings(string app, bool? undeployOnInactivity, int? inactivityPeriodDays = null)
    {
        _appSettings.Add(
            new AppSettingsEntity
            {
                Org = Org,
                App = app,
                UndeployOnInactivity = undeployOnInactivity,
                InactivityPeriodDays = inactivityPeriodDays,
            }
        );
    }

    private AppInactivityUndeployService CreateService()
    {
        _environmentsService
            .Setup(e => e.GetOrganizationEnvironments(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new EnvironmentModel { Name = Environment, PlatformUrl = "https://platform.at23.altinn.cloud" },
            ]);
        _orgSettingsService
            .Setup(s => s.GetInactivityUndeploySettingsAsync(Org, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => _orgSettings);
        _appSettingsService
            .Setup(s => s.GetAllForOrgAsync(Org, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => _appSettings);
        _appActivityRepository
            .Setup(r => r.GetForEnvironmentAsync(Org, Environment, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => _activity);
        _deploymentRepository
            .Setup(r =>
                r.GetLatestDeployTimes(Org, Environment, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(() => _latestDeploys);

        return new AppInactivityUndeployService(
            _environmentsService.Object,
            _runtimeGatewayClient.Object,
            _appSettingsService.Object,
            _orgSettingsService.Object,
            _appActivityRepository.Object,
            _deploymentRepository.Object,
            new FakeTimeProvider(s_now)
        );
    }

    private static Activity GetEnvironmentSpan(List<Activity> spans) =>
        Assert.Single(spans, span => span.DisplayName == "AppInactivityUndeployService.EvaluateEnvironment");

    private static async Task<List<Activity>> CaptureSpans(Func<Task> action)
    {
        var spans = new List<Activity>();
        using var root = new Activity("test-root").SetIdFormat(ActivityIdFormat.W3C).Start();
        // Initializes ServiceTelemetry first: creating its ActivitySource calls the listener's filter.
        string sourceName = ServiceTelemetry.Source.Name;
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == sourceName,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = activity =>
            {
                if (activity.TraceId == root.TraceId)
                {
                    lock (spans)
                    {
                        spans.Add(activity);
                    }
                }
            },
        };
        ActivitySource.AddActivityListener(listener);

        await action();
        return spans;
    }
}
