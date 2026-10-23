using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppActivity;
using Altinn.Studio.Designer.Repository.Models.AppSettings;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Finds the deployed apps of an org that have had no write activity for their inactivity period.
/// </summary>
public class AppInactivityUndeployService : IAppInactivityUndeployService
{
    // Activity is collected nightly, so this tolerates one missed collection.
    private static readonly TimeSpan s_activityFreshness = TimeSpan.FromDays(2);

    private readonly IEnvironmentsService _environmentsService;
    private readonly IRuntimeGatewayClient _runtimeGatewayClient;
    private readonly IAppSettingsService _appSettingsService;
    private readonly IOrgSettingsService _orgSettingsService;
    private readonly IAppActivityRepository _appActivityRepository;
    private readonly IDeploymentRepository _deploymentRepository;
    private readonly TimeProvider _timeProvider;

    public AppInactivityUndeployService(
        IEnvironmentsService environmentsService,
        IRuntimeGatewayClient runtimeGatewayClient,
        IAppSettingsService appSettingsService,
        IOrgSettingsService orgSettingsService,
        IAppActivityRepository appActivityRepository,
        IDeploymentRepository deploymentRepository,
        TimeProvider timeProvider
    )
    {
        _environmentsService = environmentsService;
        _runtimeGatewayClient = runtimeGatewayClient;
        _appSettingsService = appSettingsService;
        _orgSettingsService = orgSettingsService;
        _appActivityRepository = appActivityRepository;
        _deploymentRepository = deploymentRepository;
        _timeProvider = timeProvider;
    }

    public async Task<IReadOnlyList<InactivityUndeployCandidate>> GetAppsForDecommissioningAsync(
        InactivityUndeployEvaluationOptions options,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(AppInactivityUndeployService)}.{nameof(GetAppsForDecommissioningAsync)}"
        );

        Guard.AssertArgumentNotNull(options, nameof(options));
        cancellationToken.ThrowIfCancellationRequested();

        Guard.AssertArgumentNotNullOrWhiteSpace(options.Org, nameof(options.Org));

        if (!string.IsNullOrWhiteSpace(options.Environment))
        {
            Guard.AssertValidEnvironmentName(options.Environment);
        }

        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.EnvironmentFilter, options.Environment);

        var settings = await LoadSettingsAsync(options.Org, cancellationToken);
        if (!settings.AnyEnabled)
        {
            activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.CandidateCount, 0);
            return [];
        }

        var now = _timeProvider.GetUtcNow();
        var candidates = new List<InactivityUndeployCandidate>();
        var environments = await _environmentsService.GetInactivityTargetEnvironmentsForOrg(
            options.Org,
            options.Environment,
            cancellationToken
        );

        foreach (var environmentName in environments)
        {
            cancellationToken.ThrowIfCancellationRequested();
            candidates.AddRange(
                await EvaluateEnvironmentAsync(options, environmentName, settings, now, cancellationToken)
            );
        }

        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.CandidateCount, candidates.Count);
        return candidates;
    }

    private async Task<OrgSettingsSnapshot> LoadSettingsAsync(string org, CancellationToken cancellationToken)
    {
        var orgSettings = await _orgSettingsService.GetInactivityUndeploySettingsAsync(org, cancellationToken);
        var appSettings = (await _appSettingsService.GetAllForOrgAsync(org, cancellationToken))
            .Where(s => s.Environment is null)
            .ToDictionary(s => s.App, StringComparer.Ordinal);
        return new OrgSettingsSnapshot(orgSettings, appSettings);
    }

    /// <summary>
    /// Evaluates the apps deployed in one environment. Each app that is not a candidate is counted under the first
    /// rule it fails.
    /// </summary>
    private async Task<IReadOnlyList<InactivityUndeployCandidate>> EvaluateEnvironmentAsync(
        InactivityUndeployEvaluationOptions options,
        string environmentName,
        OrgSettingsSnapshot settings,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(AppInactivityUndeployService)}.EvaluateEnvironment"
        );
        activity.SetTargetEnvironment(environmentName);

        List<string> deployedApps;
        try
        {
            deployedApps = (
                await _runtimeGatewayClient.GetAppDeployments(
                    options.Org,
                    AltinnEnvironment.FromName(environmentName),
                    cancellationToken
                )
            )
                .Select(d => d.App)
                .Where(app => string.IsNullOrWhiteSpace(options.App) || app == options.App)
                .Distinct(StringComparer.Ordinal)
                .ToList();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return Fail(activity, ex, "deployments_fetch_failed");
        }

        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.DeployedAppCount, deployedApps.Count);

        var enabledApps = deployedApps
            .Select(app => (App: app, Settings: settings.ForApp(app)))
            .Where(app => app.Settings.UndeployOnInactivity)
            .ToList();
        activity?.SetTag(
            ServiceTelemetry.Attributes.InactivityUndeploy.DisabledAppCount,
            deployedApps.Count - enabledApps.Count
        );
        if (enabledApps.Count == 0)
        {
            SetCandidateCount(activity, 0);
            return [];
        }

        Dictionary<string, AppActivityRecord> activityByApp;
        try
        {
            activityByApp = (
                await _appActivityRepository.GetForEnvironmentAsync(options.Org, environmentName, cancellationToken)
            ).ToDictionary(a => a.App, StringComparer.Ordinal);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return Fail(activity, ex, "app_activity_fetch_failed");
        }

        var freshSince = now - s_activityFreshness;
        int notFresh = 0;
        int notFullyObserved = 0;
        int active = 0;
        var inactiveApps = new List<(string App, DateTimeOffset PeriodStart)>();
        foreach (var (app, appSettings) in enabledApps)
        {
            var periodStart = now.AddDays(-appSettings.InactivityPeriodDays);
            if (!activityByApp.TryGetValue(app, out var appActivity) || appActivity.LastCollectedAt < freshSince)
            {
                notFresh++;
            }
            else if (appActivity.ObservedSince > periodStart)
            {
                notFullyObserved++;
            }
            else if (appActivity.LastWriteAt >= periodStart)
            {
                active++;
            }
            else
            {
                inactiveApps.Add((app, periodStart));
            }
        }

        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.NotFreshAppCount, notFresh);
        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.NotFullyObservedAppCount, notFullyObserved);
        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.ActiveAppCount, active);
        if (inactiveApps.Count == 0)
        {
            SetCandidateCount(activity, 0);
            return [];
        }

        IReadOnlyDictionary<string, DateTimeOffset> latestDeployTimes;
        try
        {
            latestDeployTimes = await _deploymentRepository.GetLatestDeployTimes(
                options.Org,
                environmentName,
                inactiveApps.Min(app => app.PeriodStart),
                cancellationToken
            );
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return Fail(activity, ex, "recent_deployments_fetch_failed");
        }

        var candidates = inactiveApps
            .Where(app => !latestDeployTimes.TryGetValue(app.App, out var deployedAt) || deployedAt < app.PeriodStart)
            .Select(app => new InactivityUndeployCandidate
            {
                Org = options.Org,
                App = app.App,
                Environment = environmentName,
            })
            .ToList();

        activity?.SetTag(
            ServiceTelemetry.Attributes.InactivityUndeploy.RecentlyDeployedAppCount,
            inactiveApps.Count - candidates.Count
        );
        SetCandidateCount(activity, candidates.Count);
        return candidates;
    }

    private static void SetCandidateCount(Activity? activity, int count) =>
        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.CandidateCount, count);

    private static IReadOnlyList<InactivityUndeployCandidate> Fail(Activity? activity, Exception ex, string reason)
    {
        activity?.SetStatus(ActivityStatusCode.Error);
        activity?.AddException(ex);
        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.EvaluationSkipReason, reason);
        return [];
    }

    private sealed record OrgSettingsSnapshot(
        InactivityUndeploySettings OrgSettings,
        IReadOnlyDictionary<string, AppSettingsEntity> AppSettings
    )
    {
        /// <summary>
        /// Whether any app of the org can be enabled: the org is, or an app opts in itself.
        /// </summary>
        public bool AnyEnabled =>
            OrgSettings.UndeployOnInactivity || AppSettings.Values.Any(s => s.UndeployOnInactivity == true);

        public InactivityUndeploySettings ForApp(string app) =>
            InactivityUndeploySettingsResolver.ResolveApp(AppSettings.GetValueOrDefault(app), OrgSettings);
    }
}
