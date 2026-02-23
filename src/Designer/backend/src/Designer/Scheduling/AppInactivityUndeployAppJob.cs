using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

[DisallowConcurrentExecution]
public class AppInactivityUndeployAppJob : IJob
{
    private readonly IDeploymentService _deploymentService;
    private readonly ILockService _synchronizationLockService;
    private readonly SchedulingSettings _schedulingSettings;

    public AppInactivityUndeployAppJob(
        IDeploymentService deploymentService,
        ILockService synchronizationLockService,
        SchedulingSettings schedulingSettings
    )
    {
        _deploymentService = deploymentService;
        _synchronizationLockService = synchronizationLockService;
        _schedulingSettings = schedulingSettings;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        var timeout = _schedulingSettings.InactivityUndeployJobTimeouts.PerAppJobTimeout;
        using var timeoutCancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(context.CancellationToken);
        timeoutCancellationTokenSource.CancelAfter(timeout);
        var cancellationToken = timeoutCancellationTokenSource.Token;

        var org = context.MergedJobDataMap.GetString(AppInactivityUndeployJobConstants.JobDataOrgKey);
        var app = context.MergedJobDataMap.GetString(AppInactivityUndeployJobConstants.JobDataAppKey);
        var environment = context.MergedJobDataMap.GetString(AppInactivityUndeployJobConstants.JobDataEnvironmentKey);

        if (string.IsNullOrWhiteSpace(org))
        {
            throw new InvalidOperationException($"Missing required Quartz job data key '{AppInactivityUndeployJobConstants.JobDataOrgKey}'.");
        }

        if (string.IsNullOrWhiteSpace(app))
        {
            throw new InvalidOperationException($"Missing required Quartz job data key '{AppInactivityUndeployJobConstants.JobDataAppKey}'.");
        }

        if (string.IsNullOrWhiteSpace(environment))
        {
            throw new InvalidOperationException($"Missing required Quartz job data key '{AppInactivityUndeployJobConstants.JobDataEnvironmentKey}'.");
        }
        if (!AppInactivityUndeployJobConstants.IsTargetEnvironment(environment))
        {
            throw new InvalidOperationException(
                $"Unsupported environment '{environment}' for inactivity undeploy."
            );
        }

        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(AppInactivityUndeployAppJob)}.{nameof(Execute)}",
            ActivityKind.Internal
        );
        activity?.SetTag("org", org);
        activity?.SetTag("app", app);
        activity?.SetTag("environment", environment);
        activity?.SetTag("timeout.seconds", timeout.TotalSeconds);
        activity?.SetAlwaysSample();

        try
        {
            var orgContext = AltinnOrgContext.FromOrg(org);
            await using var _ = await _synchronizationLockService.AcquireOrgWideLockAsync(
                orgContext,
                timeout: null,
                cancellationToken
            );
            await _deploymentService.UndeploySystemAsync(
                AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, AppInactivityUndeployJobConstants.SystemDeveloper),
                environment,
                cancellationToken
            );
        }
        catch (OperationCanceledException ex)
            when (timeoutCancellationTokenSource.IsCancellationRequested && !context.CancellationToken.IsCancellationRequested)
        {
            activity?.SetStatus(ActivityStatusCode.Error, "Job timed out.");
            activity?.AddEvent(new ActivityEvent(
                "job_timeout",
                tags: new ActivityTagsCollection
                {
                    ["org"] = org,
                    ["app"] = app,
                    ["environment"] = environment,
                    ["timeout.seconds"] = timeout.TotalSeconds
                }
            ));
            throw new TimeoutException($"{nameof(AppInactivityUndeployAppJob)} timed out after {timeout}.", ex);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            throw;
        }
    }
}
