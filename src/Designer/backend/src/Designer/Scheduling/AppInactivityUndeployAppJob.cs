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
        var activity = RootSpan.OfJob();
        activity?.SetAlwaysSample();

        var timeout = _schedulingSettings.InactivityUndeployJobTimeouts.PerAppJobTimeout;
        using var timeoutCancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(
            context.CancellationToken
        );
        timeoutCancellationTokenSource.CancelAfter(timeout);
        var cancellationToken = timeoutCancellationTokenSource.Token;
        activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.TimeoutSeconds, timeout.TotalSeconds);

        string? org = null;
        string? app = null;
        string? environment = null;

        try
        {
            org = context.MergedJobDataMap.GetRequiredString(AppInactivityUndeployJobConstants.JobDataOrgKey);
            app = context.MergedJobDataMap.GetRequiredString(AppInactivityUndeployJobConstants.JobDataAppKey);
            environment = context.MergedJobDataMap.GetRequiredString(
                AppInactivityUndeployJobConstants.JobDataEnvironmentKey
            );
            if (!AppInactivityUndeployJobConstants.IsTargetEnvironment(environment))
            {
                throw new InvalidOperationException(
                    $"Unsupported environment '{environment}' for inactivity undeploy."
                );
            }

            activity.SetRepository(org, app);
            activity.SetTargetEnvironment(environment);

            var orgContext = AltinnOrgContext.FromOrg(org);
            await using var _ = await _synchronizationLockService.AcquireOrgWideLockAsync(
                orgContext,
                timeout: null,
                cancellationToken
            );
            await _deploymentService.UndeploySystemAsync(
                AltinnRepoEditingContext.FromOrgRepoDeveloper(
                    org,
                    app,
                    AppInactivityUndeployJobConstants.SystemDeveloper
                ),
                environment,
                cancellationToken
            );
        }
        catch (OperationCanceledException ex)
            when (timeoutCancellationTokenSource.IsCancellationRequested
                && !context.CancellationToken.IsCancellationRequested
            )
        {
            activity?.SetStatus(ActivityStatusCode.Error, "Job timed out.");
            activity?.AddException(ex);
            activity?.SetTag(ServiceTelemetry.Attributes.InactivityUndeploy.TimedOut, true);
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
