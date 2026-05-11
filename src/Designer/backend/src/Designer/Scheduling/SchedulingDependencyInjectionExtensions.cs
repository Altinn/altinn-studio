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
        ValidateSchedulingSettings(schedulingSettings);

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

            configure.AddJob<ChatInactivityCleanupJob>(options =>
                options.WithIdentity(ChatInactivityCleanupJobConstants.JobName)
            );

            configure.AddTrigger(options =>
                options
                    .ForJob(ChatInactivityCleanupJobConstants.JobName)
                    .WithIdentity(ChatInactivityCleanupJobConstants.TriggerName)
                    .WithCronSchedule(ChatInactivityCleanupJobConstants.CronScheduleNightly)
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

    private static void ValidateSchedulingSettings(SchedulingSettings schedulingSettings)
    {
        ValidateInactivityUndeployJobTimeouts(schedulingSettings.InactivityUndeployJobTimeouts);
        ValidateChatInactivityCleanup(schedulingSettings.ChatInactivityCleanup);
    }

    private static void ValidateInactivityUndeployJobTimeouts(InactivityUndeployJobTimeoutSettings settings)
    {
        const string SectionPath =
            $"{nameof(SchedulingSettings)}:{nameof(SchedulingSettings.InactivityUndeployJobTimeouts)}";
        ValidatePositive(settings.RootJobMinutes, $"{SectionPath}:{nameof(settings.RootJobMinutes)}");
        ValidatePositive(settings.PerOrgJobMinutes, $"{SectionPath}:{nameof(settings.PerOrgJobMinutes)}");
        ValidatePositive(settings.PerAppJobMinutes, $"{SectionPath}:{nameof(settings.PerAppJobMinutes)}");
    }

    private static void ValidateChatInactivityCleanup(ChatInactivityCleanupSettings settings)
    {
        ValidatePositive(
            settings.RetentionDays,
            $"{nameof(SchedulingSettings)}:{nameof(SchedulingSettings.ChatInactivityCleanup)}:{nameof(settings.RetentionDays)}"
        );
    }

    private static void ValidatePositive(int value, string settingPath)
    {
        if (value <= 0)
        {
            throw new InvalidOperationException($"{settingPath} must be greater than zero.");
        }
    }
}
