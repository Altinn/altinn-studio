using System;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

[DisallowConcurrentExecution]
public class AppInactivityUndeployJob : IJob
{
    private readonly IOrgService _orgService;
    private readonly IAppInactivityUndeployJobQueue _jobQueue;
    private readonly SchedulingSettings _schedulingSettings;

    public AppInactivityUndeployJob(
        IOrgService orgService,
        IAppInactivityUndeployJobQueue jobQueue,
        SchedulingSettings schedulingSettings
    )
    {
        _orgService = orgService;
        _jobQueue = jobQueue;
        _schedulingSettings = schedulingSettings;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(AppInactivityUndeployJob)}.{nameof(Execute)}",
            ActivityKind.Internal
        );
        activity?.SetAlwaysSample();

        var timeout = _schedulingSettings.InactivityUndeployJobTimeouts.RootJobTimeout;
        activity?.SetTag("timeout.seconds", timeout.TotalSeconds);

        using var timeoutCancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(
            context.CancellationToken
        );
        timeoutCancellationTokenSource.CancelAfter(timeout);
        var cancellationToken = timeoutCancellationTokenSource.Token;

        try
        {
            var orgList = await _orgService.GetOrgList(cancellationToken);
            activity?.SetTag("org.count", orgList.Orgs.Count);

            foreach (var org in orgList.Orgs.Keys.OrderBy(value => value, StringComparer.Ordinal))
            {
                cancellationToken.ThrowIfCancellationRequested();
                await _jobQueue.QueuePerOrgEvaluationJobAsync(org, environmentFilter: null, cancellationToken);
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
                    tags: new ActivityTagsCollection { ["timeout.seconds"] = timeout.TotalSeconds }
                )
            );
            throw new TimeoutException($"{nameof(AppInactivityUndeployJob)} timed out after {timeout}.", ex);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            throw;
        }
    }
}
