using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppActivity;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

/// <summary>
/// Collects read and write activity for deployed apps from the runtime gateway, for all orgs or the org
/// in the job data, and stores it for inactivity analysis. Read-only towards the apps.
/// </summary>
[DisallowConcurrentExecution]
public class AppActivityCollectionJob : IJob
{
    private const string SignalsStatusOk = "ok";

    private readonly IOrgService _orgService;
    private readonly IEnvironmentsService _environmentsService;
    private readonly IRuntimeGatewayClient _runtimeGatewayClient;
    private readonly IAppActivityRepository _appActivityRepository;
    private readonly TimeProvider _timeProvider;

    public AppActivityCollectionJob(
        IOrgService orgService,
        IEnvironmentsService environmentsService,
        IRuntimeGatewayClient runtimeGatewayClient,
        IAppActivityRepository appActivityRepository,
        TimeProvider timeProvider
    )
    {
        _orgService = orgService;
        _environmentsService = environmentsService;
        _runtimeGatewayClient = runtimeGatewayClient;
        _appActivityRepository = appActivityRepository;
        _timeProvider = timeProvider;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        var activity = RootSpan.OfJob();
        activity?.SetAlwaysSample();

        var timeout = AppActivityCollectionJobConstants.JobTimeout;
        activity?.SetTag(ServiceTelemetry.Attributes.AppActivity.TimeoutSeconds, timeout.TotalSeconds);
        using var timeoutCancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(
            context.CancellationToken
        );
        timeoutCancellationTokenSource.CancelAfter(timeout);
        var cancellationToken = timeoutCancellationTokenSource.Token;

        var outcomes = new List<CollectionOutcome>();
        var failedServiceOwners = 0;
        try
        {
            var org = context.MergedJobDataMap.GetOptionalString(AppActivityCollectionJobConstants.JobDataOrgKey);
            IReadOnlyList<string> orgs;
            if (org is null)
            {
                orgs = (await _orgService.GetOrgList(cancellationToken))
                    .Orgs.Keys.Order(StringComparer.Ordinal)
                    .ToList();
            }
            else
            {
                activity.SetServiceOwner(org);
                orgs = [org];
            }
            activity?.SetTag(ServiceTelemetry.Attributes.AppActivity.ServiceOwnerCount, orgs.Count);

            // The service owner varies per environment span only when the run covers several service owners.
            var setServiceOwnerPerEnvironment = org is null;
            foreach (var orgName in orgs)
            {
                IReadOnlyList<string> environments;
                try
                {
                    environments = await _environmentsService.GetInactivityTargetEnvironmentsForOrg(
                        orgName,
                        environmentFilter: null,
                        cancellationToken
                    );
                }
                catch (Exception ex) when (IsIsolatedFailure(ex, cancellationToken))
                {
                    activity?.AddException(ex);
                    failedServiceOwners++;
                    continue;
                }

                foreach (var environment in environments)
                {
                    outcomes.Add(
                        await CollectEnvironmentAsync(
                            orgName,
                            environment,
                            setServiceOwnerPerEnvironment,
                            cancellationToken
                        )
                    );
                }
            }
        }
        catch (OperationCanceledException ex)
            when (timeoutCancellationTokenSource.IsCancellationRequested
                && !context.CancellationToken.IsCancellationRequested
            )
        {
            activity?.SetStatus(ActivityStatusCode.Error, "Job timed out.");
            activity?.AddException(ex);
            activity?.SetTag(ServiceTelemetry.Attributes.AppActivity.TimedOut, true);
            throw new TimeoutException($"{nameof(AppActivityCollectionJob)} timed out after {timeout}.", ex);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            throw;
        }
        finally
        {
            SetOutcomeTags(activity, outcomes, failedServiceOwners);
        }
    }

    private async Task<CollectionOutcome> CollectEnvironmentAsync(
        string org,
        string environmentName,
        bool setServiceOwner,
        CancellationToken cancellationToken
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(AppActivityCollectionJob)}.CollectEnvironment"
        );
        if (setServiceOwner)
        {
            activity.SetServiceOwner(org);
        }
        activity.SetTargetEnvironment(environmentName);

        try
        {
            var environment = AltinnEnvironment.FromName(environmentName);
            var collectedAt = _timeProvider.GetUtcNow();
            var windowDays = ComputeWindowDays(
                await _appActivityRepository.GetLatestCollectedAtAsync(org, environmentName, cancellationToken),
                collectedAt
            );
            activity?.SetTag(ServiceTelemetry.Attributes.AppActivity.WindowDays, windowDays);

            var deployedApps = (await _runtimeGatewayClient.GetAppDeployments(org, environment, cancellationToken))
                .Select(d => d.App)
                .ToHashSet(StringComparer.Ordinal);

            // An empty list while apps are tracked as deployed is more likely a gateway problem than
            // everything being undeployed at once.
            if (
                deployedApps.Count == 0
                && await _appActivityRepository.HasDeployedAppsAsync(org, environmentName, cancellationToken)
            )
            {
                return Skip(activity, "no_deployments_listed");
            }

            AppActivitySignalsResponse signals;
            try
            {
                signals = await _runtimeGatewayClient.GetAppActivitySignalsAsync(
                    org,
                    environment,
                    windowDays,
                    cancellationToken
                );
            }
            catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Skip(activity, "signals_endpoint_not_found");
            }

            if (!string.Equals(signals.Status, SignalsStatusOk, StringComparison.OrdinalIgnoreCase))
            {
                return Skip(activity, $"signals_status_{signals.Status}");
            }

            var observations = BuildObservations(deployedApps, signals.Apps);
            await _appActivityRepository.UpsertBatchAsync(
                new AppActivityCollectionBatch
                {
                    Org = org,
                    Environment = environmentName,
                    CollectedAt = collectedAt,
                    WindowDays = windowDays,
                    Observations = observations,
                },
                cancellationToken
            );
            SetSummaryTags(activity, observations);
            return CollectionOutcome.Collected;
        }
        catch (Exception ex) when (IsIsolatedFailure(ex, cancellationToken))
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            activity?.SetTag(ServiceTelemetry.Attributes.AppActivity.CollectionSkipReason, "collection_failed");
            return CollectionOutcome.Failed;
        }
    }

    private static int ComputeWindowDays(DateTimeOffset? latestCollectedAt, DateTimeOffset now)
    {
        if (latestCollectedAt is null)
        {
            return AppActivityCollectionJobConstants.InitialWindowDays;
        }

        var elapsedDays = Math.Clamp(
            (now - latestCollectedAt.Value).TotalDays,
            0,
            AppActivityCollectionJobConstants.InitialWindowDays
        );
        return Math.Clamp(
            (int)Math.Floor(elapsedDays) + 1,
            AppActivityCollectionJobConstants.IncrementalWindowDays,
            AppActivityCollectionJobConstants.InitialWindowDays
        );
    }

    private static List<AppActivityObservation> BuildObservations(
        HashSet<string> deployedApps,
        IReadOnlyList<AppActivitySignals> appSignals
    )
    {
        var signalsByApp = appSignals.ToDictionary(
            app => app.App,
            app =>
                app.Signals.Where(signal =>
                        signal.Category is AppActivitySignalCategory.Read or AppActivitySignalCategory.Write
                    )
                    .ToDictionary(signal => signal.Category, StringComparer.Ordinal),
            StringComparer.Ordinal
        );

        return deployedApps
            .Union(signalsByApp.Keys, StringComparer.Ordinal)
            .Order(StringComparer.Ordinal)
            .Select(app =>
            {
                var signals = signalsByApp.GetValueOrDefault(app) ?? [];
                return new AppActivityObservation
                {
                    App = app,
                    Deployed = deployedApps.Contains(app),
                    LastReadAt = signals.GetValueOrDefault(AppActivitySignalCategory.Read)?.LastSeenAt,
                    LastWriteAt = signals.GetValueOrDefault(AppActivitySignalCategory.Write)?.LastSeenAt,
                    WindowCounts = signals.ToDictionary(entry => entry.Key, entry => entry.Value.Count),
                };
            })
            .ToList();
    }

    private static CollectionOutcome Skip(Activity? activity, string reason)
    {
        activity?.SetTag(ServiceTelemetry.Attributes.AppActivity.CollectionSkipReason, reason);
        return CollectionOutcome.Skipped;
    }

    private static void SetSummaryTags(Activity? activity, List<AppActivityObservation> observations)
    {
        var deployed = observations.Where(o => o.Deployed).ToList();
        activity?.SetTag(ServiceTelemetry.Attributes.AppActivity.DeployedAppCount, deployed.Count);
        activity?.SetTag(
            ServiceTelemetry.Attributes.AppActivity.DeployedAppWithoutSignalCount,
            deployed.Count(o => o.WindowCounts.Count == 0)
        );
        activity?.SetTag(
            ServiceTelemetry.Attributes.AppActivity.DeployedAppWithReadCount,
            deployed.Count(o => o.LastReadAt is not null)
        );
        activity?.SetTag(
            ServiceTelemetry.Attributes.AppActivity.DeployedAppWithWriteCount,
            deployed.Count(o => o.LastWriteAt is not null)
        );
        activity?.SetTag(
            ServiceTelemetry.Attributes.AppActivity.UndeployedAppWithSignalCount,
            observations.Count - deployed.Count
        );
    }

    private static void SetOutcomeTags(Activity? activity, List<CollectionOutcome> outcomes, int failedServiceOwners)
    {
        activity?.SetTag(
            ServiceTelemetry.Attributes.AppActivity.EnvironmentCollectedCount,
            outcomes.Count(o => o == CollectionOutcome.Collected)
        );
        activity?.SetTag(
            ServiceTelemetry.Attributes.AppActivity.EnvironmentSkippedCount,
            outcomes.Count(o => o == CollectionOutcome.Skipped)
        );
        activity?.SetTag(
            ServiceTelemetry.Attributes.AppActivity.EnvironmentFailedCount,
            outcomes.Count(o => o == CollectionOutcome.Failed)
        );
        activity?.SetTag(ServiceTelemetry.Attributes.AppActivity.ServiceOwnerFailedCount, failedServiceOwners);
    }

    // Timeouts of individual gateway calls surface as cancellations; only the job's token aborts the run.
    private static bool IsIsolatedFailure(Exception ex, CancellationToken cancellationToken)
    {
        return ex is not OperationCanceledException || !cancellationToken.IsCancellationRequested;
    }

    private enum CollectionOutcome
    {
        Collected,
        Skipped,
        Failed,
    }
}
