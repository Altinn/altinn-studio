using System;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Telemetry;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

/// <summary>
/// Evaluates an org's apps for inactivity and queues an undeploy job for each candidate, unless the org is in dry run
/// or the daily cap is reached. Per-org runs never overlap, as all of them share one job, so the cap holds.
/// </summary>
[DisallowConcurrentExecution]
public class AppInactivityUndeployPerOrgJob : IJob
{
    private const int MaxCandidateAppsOnSpan = 100;
    private static readonly TimeSpan s_capWindow = TimeSpan.FromDays(1);

    private readonly IAppInactivityUndeployService _inactivityUndeployService;
    private readonly IAppInactivityUndeployJobQueue _jobQueue;
    private readonly IDeploymentRepository _deploymentRepository;
    private readonly SchedulingSettings _schedulingSettings;
    private readonly TimeProvider _timeProvider;

    public AppInactivityUndeployPerOrgJob(
        IAppInactivityUndeployService inactivityUndeployService,
        IAppInactivityUndeployJobQueue jobQueue,
        IDeploymentRepository deploymentRepository,
        SchedulingSettings schedulingSettings,
        TimeProvider timeProvider
    )
    {
        _inactivityUndeployService = inactivityUndeployService;
        _jobQueue = jobQueue;
        _deploymentRepository = deploymentRepository;
        _schedulingSettings = schedulingSettings;
        _timeProvider = timeProvider;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        var activity = RootSpan.OfJob();
        activity?.SetAlwaysSample();

        var timeout = _schedulingSettings.InactivityUndeployJobTimeouts.PerOrgJobTimeout;
        using var timeoutCancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(
            context.CancellationToken
        );
        timeoutCancellationTokenSource.CancelAfter(timeout);
        var cancellationToken = timeoutCancellationTokenSource.Token;
        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.TimeoutSeconds, timeout.TotalSeconds);

        string? org = null;
        string? environmentFilter = null;

        try
        {
            org = context.MergedJobDataMap.GetRequiredString(AppInactivityUndeployJobConstants.JobDataOrgKey);
            environmentFilter = context.MergedJobDataMap.GetOptionalString(
                AppInactivityUndeployJobConstants.JobDataEnvironmentFilterKey
            );
            activity.SetServiceOwner(org);
            activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.EnvironmentFilter, environmentFilter);

            var candidates = await _inactivityUndeployService.GetAppsForDecommissioningAsync(
                new InactivityUndeployEvaluationOptions { Org = org, Environment = environmentFilter },
                cancellationToken
            );

            var orderedCandidates = candidates
                .OrderBy(e => e.App, StringComparer.Ordinal)
                .ThenBy(e => e.Environment, StringComparer.Ordinal)
                .ToArray();
            activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.CandidateCount, orderedCandidates.Length);
            activity?.SetTag(
                ServiceTelemetry.Attributes.InactivityUndeploy.CandidateApps,
                orderedCandidates.Take(MaxCandidateAppsOnSpan).Select(c => $"{c.Environment}/{c.App}").ToArray()
            );

            var dryRun = !_schedulingSettings.InactivityUndeploy.IsEnforced(org);
            activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.DryRun, dryRun);
            if (dryRun || orderedCandidates.Length == 0)
            {
                return;
            }

            await QueueWithinDailyCapAsync(activity, orderedCandidates, cancellationToken);
        }
        catch (OperationCanceledException ex)
            when (timeoutCancellationTokenSource.IsCancellationRequested
                && !context.CancellationToken.IsCancellationRequested
            )
        {
            activity?.SetStatus(ActivityStatusCode.Error, "Job timed out.");
            activity?.AddException(ex);
            activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.TimedOut, true);
            throw new TimeoutException($"{nameof(AppInactivityUndeployPerOrgJob)} timed out after {timeout}.", ex);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            throw;
        }
    }

    /// <summary>
    /// Queues undeploy jobs while the system undeploys of the last 24 hours, and the queued jobs that haven't
    /// finished, stay below the daily cap. A job is counted twice while it runs, which only makes the cap stricter.
    /// </summary>
    private async Task QueueWithinDailyCapAsync(
        Activity? activity,
        InactivityUndeployCandidate[] orderedCandidates,
        CancellationToken cancellationToken
    )
    {
        var maxUndeploysPerDay = _schedulingSettings.InactivityUndeploy.MaxUndeploysPerDay;
        var recentUndeploys = await _deploymentRepository.CountDecommissionsCreatedBySince(
            AppInactivityUndeployJobConstants.SystemDeveloper,
            _timeProvider.GetUtcNow() - s_capWindow,
            cancellationToken
        );
        var pendingUndeployJobs = await _jobQueue.CountPendingPerAppUndeployJobsAsync(cancellationToken);
        var remaining = maxUndeploysPerDay - recentUndeploys - pendingUndeployJobs;
        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.MaxUndeploysPerDay, maxUndeploysPerDay);
        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.RecentUndeployCount, recentUndeploys);
        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.PendingUndeployJobCount, pendingUndeployJobs);

        var queued = 0;
        var index = 0;
        for (; index < orderedCandidates.Length && queued < remaining; index++)
        {
            var candidate = orderedCandidates[index];
            if (
                await _jobQueue.QueuePerAppUndeployJobAsync(
                    candidate.Org,
                    candidate.App,
                    candidate.Environment,
                    index,
                    cancellationToken
                )
            )
            {
                queued++;
            }
        }

        var capSkipped = orderedCandidates.Length - index;
        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.QueuedCount, queued);
        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.CapReached, capSkipped > 0);
        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.CapSkippedCount, capSkipped);
    }
}
