#nullable disable
using System;
using Altinn.Studio.Designer.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

public static class SchedulingDependencyInjectionExtensions
{
    // These policy limits stay well within the date arithmetic range while exceeding operational needs.
    internal const int MaximumRetentionDays = 365 * 100;

    // CancellationTokenSource uses the underlying timer's maximum delay.
    internal const int MaximumTimerDelayMinutes = 71_582;
    internal const int MaximumTimerDelaySeconds = 4_294_967;

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

            configure.AddJob<LangfuseTraceCleanupJob>(options =>
                options.WithIdentity(LangfuseTraceCleanupJobConstants.JobName)
            );

            configure.AddTrigger(options =>
                options
                    .ForJob(LangfuseTraceCleanupJobConstants.JobName)
                    .WithIdentity(LangfuseTraceCleanupJobConstants.TriggerName)
                    .WithCronSchedule(LangfuseTraceCleanupJobConstants.CronScheduleNightly)
            );

            if (schedulingSettings.RepositoryCleanup.Enabled)
            {
                configure.AddJob<RepositoryCleanupJob>(options =>
                    options.WithIdentity(RepositoryCleanupJobConstants.JobName)
                );

                configure.AddTrigger(options =>
                    options
                        .ForJob(RepositoryCleanupJobConstants.JobName)
                        .WithIdentity(RepositoryCleanupJobConstants.TriggerName)
                        .WithCronSchedule(
                            schedulingSettings.RepositoryCleanup.CronExpression,
                            schedule => schedule.WithMisfireHandlingInstructionDoNothing()
                        )
                );
            }

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

    internal static void ValidateSchedulingSettings(SchedulingSettings schedulingSettings)
    {
        ValidateInactivityUndeployJobTimeouts(schedulingSettings.InactivityUndeployJobTimeouts);
        ValidateChatInactivityCleanup(schedulingSettings.ChatInactivityCleanup);
        ValidateRepositoryCleanup(schedulingSettings.RepositoryCleanup);
    }

    private static void ValidateInactivityUndeployJobTimeouts(InactivityUndeployJobTimeoutSettings settings)
    {
        const string SectionPath =
            $"{nameof(SchedulingSettings)}:{nameof(SchedulingSettings.InactivityUndeployJobTimeouts)}";
        ValidateRange(
            settings.RootJobMinutes,
            MaximumTimerDelayMinutes,
            $"{SectionPath}:{nameof(settings.RootJobMinutes)}"
        );
        ValidateRange(
            settings.PerOrgJobMinutes,
            MaximumTimerDelayMinutes,
            $"{SectionPath}:{nameof(settings.PerOrgJobMinutes)}"
        );
        ValidateRange(
            settings.PerAppJobMinutes,
            MaximumTimerDelayMinutes,
            $"{SectionPath}:{nameof(settings.PerAppJobMinutes)}"
        );
    }

    private static void ValidateChatInactivityCleanup(ChatInactivityCleanupSettings settings)
    {
        ValidateRange(
            settings.RetentionDays,
            MaximumRetentionDays,
            $"{nameof(SchedulingSettings)}:{nameof(SchedulingSettings.ChatInactivityCleanup)}:{nameof(settings.RetentionDays)}"
        );
    }

    private static void ValidateRepositoryCleanup(RepositoryCleanupSettings settings)
    {
        string sectionPath = $"{nameof(SchedulingSettings)}:{nameof(SchedulingSettings.RepositoryCleanup)}";
        ValidateRange(settings.RetentionDays, MaximumRetentionDays, $"{sectionPath}:{nameof(settings.RetentionDays)}");
        ValidatePositive(settings.MaxRepositoriesPerRun, $"{sectionPath}:{nameof(settings.MaxRepositoriesPerRun)}");
        ValidatePositive(settings.DeletionRetryAttempts, $"{sectionPath}:{nameof(settings.DeletionRetryAttempts)}");
        ValidatePositive(
            settings.DeletionRetryDelayMilliseconds,
            $"{sectionPath}:{nameof(settings.DeletionRetryDelayMilliseconds)}"
        );
        ValidateRange(
            settings.LockTimeoutSeconds,
            MaximumTimerDelaySeconds,
            $"{sectionPath}:{nameof(settings.LockTimeoutSeconds)}"
        );
        ValidateRange(
            settings.JobTimeoutMinutes,
            MaximumTimerDelayMinutes,
            $"{sectionPath}:{nameof(settings.JobTimeoutMinutes)}"
        );
        if (!CronExpression.IsValidExpression(settings.CronExpression))
        {
            throw new InvalidOperationException(
                $"{sectionPath}:{nameof(settings.CronExpression)} must be a valid Quartz cron expression."
            );
        }
    }

    private static void ValidatePositive(int value, string settingPath)
    {
        if (value <= 0)
        {
            throw new InvalidOperationException($"{settingPath} must be greater than zero.");
        }
    }

    private static void ValidateRange(int value, int maximum, string settingPath)
    {
        ValidatePositive(value, settingPath);
        if (value > maximum)
        {
            throw new InvalidOperationException($"{settingPath} must be less than or equal to {maximum}.");
        }
    }
}
