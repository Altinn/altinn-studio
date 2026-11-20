using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppSettings;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AppInactivityUndeployService : IAppInactivityUndeployService
{
    private const string MetricsStatusOk = "ok";

    private readonly IEnvironmentsService _environmentsService;
    private readonly IRuntimeGatewayClient _runtimeGatewayClient;
    private readonly IAppSettingsService _appSettingsService;
    private readonly IDeploymentRepository _deploymentRepository;

    public AppInactivityUndeployService(
        IEnvironmentsService environmentsService,
        IRuntimeGatewayClient runtimeGatewayClient,
        IAppSettingsService appSettingsService,
        IDeploymentRepository deploymentRepository
    )
    {
        _environmentsService = environmentsService;
        _runtimeGatewayClient = runtimeGatewayClient;
        _appSettingsService = appSettingsService;
        _deploymentRepository = deploymentRepository;
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
        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.WindowDays, options.WindowDays);
        var recentDeploymentCutoffUtc = DateTimeOffset.UtcNow.AddDays(-options.WindowDays);

        var settings = await _appSettingsService.GetAllAsync(cancellationToken);
        var enabledApps = BuildEnabledSettingsLookup(settings, options.Org);

        if (enabledApps.Count == 0)
        {
            activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.CandidateCount, 0);
            return [];
        }

        if (!string.IsNullOrWhiteSpace(options.App) && !enabledApps.Contains(options.App))
        {
            activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.CandidateCount, 0);
            return [];
        }

        var candidates = new List<InactivityUndeployCandidate>();
        var environments = await _environmentsService.GetInactivityTargetEnvironmentsForOrg(
            options.Org,
            options.Environment,
            cancellationToken
        );

        foreach (var environmentName in environments)
        {
            cancellationToken.ThrowIfCancellationRequested();
            using var environmentActivity = ServiceTelemetry.Source.StartActivity(
                $"{nameof(AppInactivityUndeployService)}.EvaluateEnvironment"
            );
            environmentActivity.SetTargetEnvironment(environmentName);

            var environment = AltinnEnvironment.FromName(environmentName);

            List<AppDeployment> deployments;
            try
            {
                deployments = (
                    await _runtimeGatewayClient.GetAppDeployments(options.Org, environment, cancellationToken)
                )
                    .Where(d => string.IsNullOrWhiteSpace(options.App) || d.App == options.App)
                    .GroupBy(d => d.App, StringComparer.Ordinal)
                    .Select(g => g.First())
                    .ToList();
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                environmentActivity?.SetStatus(ActivityStatusCode.Error, "Failed to fetch deployments.");
                environmentActivity?.AddException(ex);
                SetEvaluationSkipped(environmentActivity, "deployments_fetch_failed");
                continue;
            }

            if (deployments.Count == 0)
            {
                continue;
            }

            AppActivityMetricsResponse activityMetrics;
            try
            {
                activityMetrics = await _runtimeGatewayClient.GetAppActivityMetricsAsync(
                    options.Org,
                    environment,
                    options.WindowDays,
                    cancellationToken
                );
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                environmentActivity?.SetStatus(ActivityStatusCode.Error, "Failed to fetch activity metrics.");
                environmentActivity?.AddException(ex);
                SetEvaluationSkipped(environmentActivity, "activity_metrics_fetch_failed");
                continue;
            }

            if (!string.Equals(activityMetrics.Status, MetricsStatusOk, StringComparison.OrdinalIgnoreCase))
            {
                SetEvaluationSkipped(environmentActivity, $"metrics_status_{activityMetrics.Status}");
                continue;
            }

            var activeApps = new HashSet<string>(
                activityMetrics.ActiveAppRequestCounts?.Keys ?? [],
                StringComparer.Ordinal
            );

            if (!deployments.Any(d => enabledApps.Contains(d.App) && !activeApps.Contains(d.App)))
            {
                continue;
            }

            HashSet<string> recentlyDeployedApps;
            try
            {
                recentlyDeployedApps = (
                    await _deploymentRepository.GetAppsWithRecentDeployments(
                        options.Org,
                        environmentName,
                        recentDeploymentCutoffUtc
                    )
                ).ToHashSet(StringComparer.Ordinal);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                environmentActivity?.SetStatus(ActivityStatusCode.Error, "Failed to fetch recent deployments.");
                environmentActivity?.AddException(ex);
                SetEvaluationSkipped(environmentActivity, "recent_deployments_fetch_failed");
                continue;
            }

            foreach (var deployment in deployments)
            {
                if (
                    !enabledApps.Contains(deployment.App)
                    || activeApps.Contains(deployment.App)
                    || recentlyDeployedApps.Contains(deployment.App)
                )
                {
                    continue;
                }

                candidates.Add(
                    new InactivityUndeployCandidate
                    {
                        Org = deployment.Org,
                        App = deployment.App,
                        Environment = environmentName,
                    }
                );
            }
        }

        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.CandidateCount, candidates.Count);
        return candidates;
    }

    private static void SetEvaluationSkipped(Activity? environmentActivity, string reason) =>
        environmentActivity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.EvaluationSkipReason, reason);

    private static HashSet<string> BuildEnabledSettingsLookup(IReadOnlyList<AppSettingsEntity> settings, string org)
    {
        return settings
            .Where(s => string.Equals(s.Org, org, StringComparison.OrdinalIgnoreCase))
            .Where(s => s.UndeployOnInactivity)
            .Where(s => string.IsNullOrWhiteSpace(s.Environment))
            .Select(s => s.App)
            .ToHashSet(StringComparer.Ordinal);
    }
}
