using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.AppSettings;
using Altinn.Studio.Designer.Scheduling;
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

    public AppInactivityUndeployService(
        IEnvironmentsService environmentsService,
        IRuntimeGatewayClient runtimeGatewayClient,
        IAppSettingsService appSettingsService
    )
    {
        _environmentsService = environmentsService;
        _runtimeGatewayClient = runtimeGatewayClient;
        _appSettingsService = appSettingsService;
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

        activity?.SetTag("org", options.Org);
        activity?.SetTag("app", options.App);
        activity?.SetTag("environment.filter", options.Environment);
        activity?.SetTag("window.days", options.WindowDays);

        var settings = await _appSettingsService.GetAllAsync(cancellationToken);
        var enabledApps = BuildEnabledSettingsLookup(settings, options.Org);

        if (enabledApps.Count == 0)
        {
            activity?.SetTag("candidate.count", 0);
            return [];
        }

        if (!string.IsNullOrWhiteSpace(options.App) && !enabledApps.Contains(options.App))
        {
            activity?.SetTag("candidate.count", 0);
            return [];
        }

        var candidates = new List<InactivityUndeployCandidate>();
        var environments = await GetTargetEnvironmentsForOrg(options.Org, options.Environment, cancellationToken);

        foreach (var environmentName in environments)
        {
            cancellationToken.ThrowIfCancellationRequested();
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
                activity?.AddException(ex);
                activity?.AddEvent(
                    CreateSkippedEvaluationEvent(options.Org, environmentName, "deployments_fetch_failed")
                );
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
                activity?.AddException(ex);
                activity?.AddEvent(
                    CreateSkippedEvaluationEvent(options.Org, environmentName, "activity_metrics_fetch_failed")
                );
                continue;
            }

            if (!string.Equals(activityMetrics.Status, MetricsStatusOk, StringComparison.OrdinalIgnoreCase))
            {
                activity?.AddEvent(
                    CreateSkippedEvaluationEvent(
                        options.Org,
                        environmentName,
                        $"metrics_status_{activityMetrics.Status}"
                    )
                );
                continue;
            }

            var activeApps = new HashSet<string>(
                activityMetrics.ActiveAppRequestCounts?.Keys ?? [],
                StringComparer.Ordinal
            );

            foreach (var deployment in deployments)
            {
                if (!enabledApps.Contains(deployment.App) || activeApps.Contains(deployment.App))
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

        activity?.SetTag("candidate.count", candidates.Count);
        return candidates;
    }

    private static ActivityEvent CreateSkippedEvaluationEvent(string org, string environment, string reason)
    {
        return new ActivityEvent(
            "inactivity_evaluation_skipped",
            tags: new ActivityTagsCollection
            {
                { "org", org },
                { "environment", environment },
                { "reason", reason },
            }
        );
    }

    private static HashSet<string> BuildEnabledSettingsLookup(IReadOnlyList<AppSettingsEntity> settings, string org)
    {
        return settings
            .Where(s => string.Equals(s.Org, org, StringComparison.OrdinalIgnoreCase))
            .Where(s => s.UndeployOnInactivity)
            .Where(s => string.IsNullOrWhiteSpace(s.Environment))
            .Select(s => s.App)
            .ToHashSet(StringComparer.Ordinal);
    }

    private async Task<IReadOnlyList<string>> GetTargetEnvironmentsForOrg(
        string org,
        string? envFilter,
        CancellationToken cancellationToken
    )
    {
        if (!string.IsNullOrWhiteSpace(envFilter))
        {
            return AppInactivityUndeployJobConstants.IsTargetEnvironment(envFilter) ? [envFilter] : [];
        }

        var environments = await _environmentsService.GetOrganizationEnvironments(org, cancellationToken);
        return environments.Select(e => e.Name).Where(AppInactivityUndeployJobConstants.IsTargetEnvironment).ToArray();
    }
}
