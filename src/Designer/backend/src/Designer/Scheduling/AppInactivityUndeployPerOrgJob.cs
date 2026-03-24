using System;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Telemetry;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

[DisallowConcurrentExecution]
public class AppInactivityUndeployPerOrgJob : IJob
{
    private readonly IAppInactivityUndeployService _inactivityUndeployService;
    private readonly IAppInactivityUndeployJobQueue _jobQueue;
    private readonly SchedulingSettings _schedulingSettings;

    public AppInactivityUndeployPerOrgJob(
        IAppInactivityUndeployService inactivityUndeployService,
        IAppInactivityUndeployJobQueue jobQueue,
        SchedulingSettings schedulingSettings
    )
    {
        _inactivityUndeployService = inactivityUndeployService;
        _jobQueue = jobQueue;
        _schedulingSettings = schedulingSettings;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(AppInactivityUndeployPerOrgJob)}.{nameof(Execute)}",
            ActivityKind.Internal
        );
        activity?.SetAlwaysSample();

        var timeout = _schedulingSettings.InactivityUndeployJobTimeouts.PerOrgJobTimeout;
        using var timeoutCancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(
            context.CancellationToken
        );
        timeoutCancellationTokenSource.CancelAfter(timeout);
        var cancellationToken = timeoutCancellationTokenSource.Token;
        activity?.SetTag("timeout.seconds", timeout.TotalSeconds);

        string? org = null;
        string? environmentFilter = null;

        try
        {
            org = context.MergedJobDataMap.GetRequiredString(AppInactivityUndeployJobConstants.JobDataOrgKey);
            environmentFilter = context.MergedJobDataMap.GetOptionalString(
                AppInactivityUndeployJobConstants.JobDataEnvironmentFilterKey
            );
            activity?.SetTag("org", org);
            activity?.SetTag("environment.filter", environmentFilter);

            var candidates = await _inactivityUndeployService.GetAppsForDecommissioningAsync(
                new InactivityUndeployEvaluationOptions { Org = org, Environment = environmentFilter },
                cancellationToken
            );

            var orderedCandidates = candidates
                .OrderBy(e => e.App, StringComparer.Ordinal)
                .ThenBy(e => e.Environment, StringComparer.Ordinal)
                .ToArray();
            activity?.SetTag("candidate.count", orderedCandidates.Length);

            for (var index = 0; index < orderedCandidates.Length; index++)
            {
                var candidate = orderedCandidates[index];
                await _jobQueue.QueuePerAppUndeployJobAsync(
                    candidate.Org,
                    candidate.App,
                    candidate.Environment,
                    index,
                    cancellationToken
                );
            }
        }
        catch (OperationCanceledException ex)
            when (timeoutCancellationTokenSource.IsCancellationRequested
                && !context.CancellationToken.IsCancellationRequested
            )
        {
            activity?.SetStatus(ActivityStatusCode.Error, "Job timed out.");
            activity?.AddException(ex);
            activity?.AddEvent(
                new ActivityEvent(
                    "job_timeout",
                    tags: new ActivityTagsCollection { ["org"] = org, ["timeout.seconds"] = timeout.TotalSeconds }
                )
            );
            throw new TimeoutException($"{nameof(AppInactivityUndeployPerOrgJob)} timed out after {timeout}.", ex);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            throw;
        }
    }
}
