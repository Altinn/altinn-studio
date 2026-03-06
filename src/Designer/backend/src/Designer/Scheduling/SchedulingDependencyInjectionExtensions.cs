#nullable disable
using System;
using Altinn.Studio.Designer.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

public static class SchedulingDependencyInjectionExtensions
{
    public static IServiceCollection AddQuartzJobScheduling(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        SchedulingSettings schedulingSettings =
            configuration.GetSection(nameof(SchedulingSettings)).Get<SchedulingSettings>() ?? new SchedulingSettings();
        ValidateInactivityUndeployJobTimeouts(schedulingSettings.InactivityUndeployJobTimeouts);

        services.AddSingleton(schedulingSettings);
        services.AddSingleton<IAppInactivityUndeployJobQueue, AppInactivityUndeployJobQueue>();
        services.AddQuartz(configure =>
        {
            configure.AddJob<AppInactivityUndeployJob>(options =>
                options.WithIdentity(
                    AppInactivityUndeployJobConstants.JobName,
                    AppInactivityUndeployJobConstants.JobGroup
                )
            );

            configure.AddTrigger(options =>
                options
                    .ForJob(AppInactivityUndeployJobConstants.JobName, AppInactivityUndeployJobConstants.JobGroup)
                    .WithIdentity(
                        AppInactivityUndeployJobConstants.TriggerName,
                        AppInactivityUndeployJobConstants.TriggerGroup
                    )
                    .WithCronSchedule(AppInactivityUndeployJobConstants.CronScheduleNightlyMidnight)
            );

            configure.AddJob<DeploymentDispatchSweeperJob>(options =>
                options.WithIdentity(
                    DeploymentDispatchSweeperJobConstants.JobName,
                    DeploymentDispatchSweeperJobConstants.JobGroup
                )
            );

            configure.AddTrigger(options =>
                options
                    .ForJob(
                        DeploymentDispatchSweeperJobConstants.JobName,
                        DeploymentDispatchSweeperJobConstants.JobGroup
                    )
                    .WithIdentity(
                        DeploymentDispatchSweeperJobConstants.TriggerName,
                        DeploymentDispatchSweeperJobConstants.TriggerGroup
                    )
                    .StartNow()
                    .WithSimpleSchedule(x =>
                        x.WithIntervalInSeconds(DeploymentDispatchSweeperJobConstants.IntervalInSeconds).RepeatForever()
                    )
            );

            configure.AddJob<DeploymentPollingRecoveryJob>(options =>
                options.WithIdentity(
                    DeploymentPollingRecoveryJobConstants.JobName,
                    DeploymentPollingRecoveryJobConstants.JobGroup
                )
            );

            configure.AddTrigger(options =>
                options
                    .ForJob(
                        DeploymentPollingRecoveryJobConstants.JobName,
                        DeploymentPollingRecoveryJobConstants.JobGroup
                    )
                    .WithIdentity(
                        DeploymentPollingRecoveryJobConstants.TriggerName,
                        DeploymentPollingRecoveryJobConstants.TriggerGroup
                    )
                    .StartNow()
                    .WithSimpleSchedule(x =>
                        x.WithIntervalInSeconds(DeploymentPollingRecoveryJobConstants.IntervalInSeconds).RepeatForever()
                    )
            );

            if (schedulingSettings.UsePersistentScheduling)
            {
                PostgreSQLSettings postgresSettings = configuration
                    .GetSection(nameof(PostgreSQLSettings))
                    .Get<PostgreSQLSettings>();
                configure.UsePersistentStore(s =>
                {
                    s.UseSystemTextJsonSerializer();
                    s.UsePostgres(postgresSettings.FormattedConnectionString());
                    s.UseClustering();
                });
            }
        });
        if (schedulingSettings.AddHostedService)
        {
            services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);
        }
        return services;
    }

    private static void ValidateInactivityUndeployJobTimeouts(InactivityUndeployJobTimeoutSettings settings)
    {
        ValidatePositiveMinutes(settings.RootJobMinutes, nameof(settings.RootJobMinutes));
        ValidatePositiveMinutes(settings.PerOrgJobMinutes, nameof(settings.PerOrgJobMinutes));
        ValidatePositiveMinutes(settings.PerAppJobMinutes, nameof(settings.PerAppJobMinutes));
    }

    private static void ValidatePositiveMinutes(int value, string propertyName)
    {
        if (value <= 0)
        {
            throw new InvalidOperationException(
                $"SchedulingSettings:InactivityUndeployJobTimeouts:{propertyName} must be greater than zero."
            );
        }
    }
}
