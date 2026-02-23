using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Telemetry;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

public class AppInactivityUndeployJobQueue : IAppInactivityUndeployJobQueue
{
    private readonly ISchedulerFactory _schedulerFactory;

    public AppInactivityUndeployJobQueue(ISchedulerFactory schedulerFactory)
    {
        _schedulerFactory = schedulerFactory;
    }

    public async Task<bool> QueuePerOrgEvaluationJobAsync(
        string org,
        string? environmentFilter,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(AppInactivityUndeployJobQueue)}.{nameof(QueuePerOrgEvaluationJobAsync)}",
            ActivityKind.Internal
        );
        activity?.SetTag("org", org);
        activity?.SetTag("environment.filter", environmentFilter);

        Guard.AssertValidateOrganization(org);
        if (!string.IsNullOrWhiteSpace(environmentFilter))
        {
            Guard.AssertValidEnvironmentName(environmentFilter);
            if (!AppInactivityUndeployJobConstants.IsTargetEnvironment(environmentFilter))
            {
                throw new ArgumentException(
                    $"Unsupported environment '{environmentFilter}' for inactivity undeploy.",
                    nameof(environmentFilter)
                );
            }
        }

        var scheduler = await _schedulerFactory.GetScheduler(cancellationToken);
        var identitySuffix = AppInactivityUndeployJobConstants.BuildPerOrgIdentitySuffix(org, environmentFilter);

        var jobKey = new JobKey(
            AppInactivityUndeployJobConstants.PerOrgJobName,
            AppInactivityUndeployJobConstants.PerOrgJobGroup
        );

        var triggerKey = new TriggerKey(
            $"{AppInactivityUndeployJobConstants.PerOrgTriggerNamePrefix}{identitySuffix}",
            AppInactivityUndeployJobConstants.PerOrgTriggerGroup
        );

        await EnsureDurableJobExistsAsync<AppInactivityUndeployPerOrgJob>(scheduler, jobKey, cancellationToken);

        var triggerBuilder = TriggerBuilder
            .Create()
            .WithIdentity(triggerKey)
            .ForJob(jobKey)
            .StartNow()
            .UsingJobData(AppInactivityUndeployJobConstants.JobDataOrgKey, org);

        if (!string.IsNullOrWhiteSpace(environmentFilter))
        {
            triggerBuilder = triggerBuilder.UsingJobData(
                AppInactivityUndeployJobConstants.JobDataEnvironmentFilterKey,
                environmentFilter
            );
        }

        try
        {
            await scheduler.ScheduleJob(triggerBuilder.Build(), cancellationToken);
            activity?.SetTag("queued", true);
            return true;
        }
        catch (ObjectAlreadyExistsException)
        {
            activity?.SetTag("queued", false);
            activity?.SetTag("queue.reason", "trigger_already_exists");
            return false;
        }
    }

    public async Task<bool> QueuePerAppUndeployJobAsync(
        string org,
        string app,
        string environment,
        int index,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(AppInactivityUndeployJobQueue)}.{nameof(QueuePerAppUndeployJobAsync)}",
            ActivityKind.Internal
        );
        activity?.SetTag("org", org);
        activity?.SetTag("app", app);
        activity?.SetTag("environment", environment);
        activity?.SetTag("index", index);

        Guard.AssertValidateOrganization(org);
        Guard.AssertValidAppRepoName(app);
        Guard.AssertArgumentNotNullOrWhiteSpace(environment, nameof(environment));
        Guard.AssertValidEnvironmentName(environment);
        if (!AppInactivityUndeployJobConstants.IsTargetEnvironment(environment))
        {
            throw new ArgumentException(
                $"Unsupported environment '{environment}' for inactivity undeploy.",
                nameof(environment)
            );
        }
        if (index < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(index), "index must be zero or positive.");
        }

        var scheduler = await _schedulerFactory.GetScheduler(cancellationToken);
        var delay = TimeSpan.FromSeconds((long)index * AppInactivityUndeployJobConstants.PerAppBaseDelaySeconds);
        var scheduledAt = DateTimeOffset.UtcNow.Add(delay);

        var identitySuffix = $"{org}-{app}-{environment}";
        var jobKey = new JobKey(
            AppInactivityUndeployJobConstants.PerAppJobName,
            AppInactivityUndeployJobConstants.PerAppJobGroup
        );

        var triggerKey = new TriggerKey(
            $"{AppInactivityUndeployJobConstants.PerAppTriggerNamePrefix}{identitySuffix}",
            AppInactivityUndeployJobConstants.PerAppTriggerGroup
        );

        await EnsureDurableJobExistsAsync<AppInactivityUndeployAppJob>(scheduler, jobKey, cancellationToken);

        var trigger = TriggerBuilder
            .Create()
            .WithIdentity(triggerKey)
            .ForJob(jobKey)
            .StartAt(scheduledAt)
            .UsingJobData(AppInactivityUndeployJobConstants.JobDataOrgKey, org)
            .UsingJobData(AppInactivityUndeployJobConstants.JobDataAppKey, app)
            .UsingJobData(AppInactivityUndeployJobConstants.JobDataEnvironmentKey, environment)
            .Build();

        try
        {
            await scheduler.ScheduleJob(trigger, cancellationToken);
            activity?.SetTag("queued", true);
            return true;
        }
        catch (ObjectAlreadyExistsException)
        {
            activity?.SetTag("queued", false);
            activity?.SetTag("queue.reason", "trigger_already_exists");
            return false;
        }
    }

    private static async Task EnsureDurableJobExistsAsync<TJob>(
        IScheduler scheduler,
        JobKey jobKey,
        CancellationToken cancellationToken
    )
        where TJob : IJob
    {
        if (await scheduler.CheckExists(jobKey, cancellationToken))
        {
            return;
        }

        var job = JobBuilder.Create<TJob>().WithIdentity(jobKey).StoreDurably().Build();

        try
        {
            await scheduler.AddJob(
                job,
                replace: false,
                storeNonDurableWhileAwaitingScheduling: false,
                cancellationToken: cancellationToken
            );
        }
        catch (ObjectAlreadyExistsException)
        {
            // Another scheduler instance added it first.
        }
    }
}
