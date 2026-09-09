using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Scheduling;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Quartz;
using Xunit;

namespace Designer.Tests.Scheduling;

public class SchedulingDependencyInjectionExtensionsTests
{
    [Fact]
    public void ValidateSchedulingSettings_AcceptsUpperBounds()
    {
        var settings = new SchedulingSettings
        {
            InactivityUndeployJobTimeouts = new InactivityUndeployJobTimeoutSettings
            {
                RootJobMinutes = SchedulingDependencyInjectionExtensions.MaximumTimerDelayMinutes,
                PerOrgJobMinutes = SchedulingDependencyInjectionExtensions.MaximumTimerDelayMinutes,
                PerAppJobMinutes = SchedulingDependencyInjectionExtensions.MaximumTimerDelayMinutes,
            },
            ChatInactivityCleanup = new ChatInactivityCleanupSettings
            {
                RetentionDays = SchedulingDependencyInjectionExtensions.MaximumRetentionDays,
            },
            RepositoryCleanup = new RepositoryCleanupSettings
            {
                RetentionDays = SchedulingDependencyInjectionExtensions.MaximumRetentionDays,
                MaxRepositoriesPerRun = 1,
                DeletionRetryAttempts = 1,
                DeletionRetryDelayMilliseconds = int.MaxValue,
                LockTimeoutSeconds = SchedulingDependencyInjectionExtensions.MaximumTimerDelaySeconds,
                JobTimeoutMinutes = SchedulingDependencyInjectionExtensions.MaximumTimerDelayMinutes,
            },
        };

        SchedulingDependencyInjectionExtensions.ValidateSchedulingSettings(settings);
    }

    [Theory]
    [InlineData("RootJobMinutes")]
    [InlineData("PerOrgJobMinutes")]
    [InlineData("PerAppJobMinutes")]
    [InlineData("ChatRetentionDays")]
    [InlineData("RepositoryRetentionDays")]
    [InlineData("LockTimeoutSeconds")]
    [InlineData("JobTimeoutMinutes")]
    public void ValidateSchedulingSettings_RejectsFirstValueAboveUpperBound(string settingName)
    {
        var settings = new SchedulingSettings();
        SetFirstUnsupportedValue(settings, settingName);

        Assert.Throws<InvalidOperationException>(() =>
            SchedulingDependencyInjectionExtensions.ValidateSchedulingSettings(settings)
        );
    }

    [Fact]
    public void AddQuartzJobScheduling_RepositoryCleanupTriggerHasNoStartupDelay()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string>
                {
                    [$"{nameof(SchedulingSettings)}:{nameof(SchedulingSettings.UsePersistentScheduling)}"] = "false",
                    [$"{nameof(SchedulingSettings)}:{nameof(SchedulingSettings.AddHostedService)}"] = "false",
                    [
                        $"{nameof(SchedulingSettings)}:{nameof(SchedulingSettings.RepositoryCleanup)}:{nameof(RepositoryCleanupSettings.Enabled)}"
                    ] = "true",
                }
            )
            .Build();
        var services = new ServiceCollection();
        services.AddQuartzJobScheduling(configuration);
        using ServiceProvider serviceProvider = services.BuildServiceProvider();
        DateTimeOffset earliestExpectedStart = DateTimeOffset.UtcNow.AddSeconds(-1);

        ITrigger trigger = serviceProvider
            .GetRequiredService<IOptions<QuartzOptions>>()
            .Value.Triggers.Single(trigger => trigger.Key.Name == RepositoryCleanupJobConstants.TriggerName);

        Assert.InRange(trigger.StartTimeUtc, earliestExpectedStart, DateTimeOffset.UtcNow);
    }

    [Fact]
    public void ValidateSchedulingSettings_RejectsNonPositiveValue()
    {
        var settings = new SchedulingSettings();
        settings.RepositoryCleanup.MaxRepositoriesPerRun = 0;

        Assert.Throws<InvalidOperationException>(() =>
            SchedulingDependencyInjectionExtensions.ValidateSchedulingSettings(settings)
        );
    }

    private static void SetFirstUnsupportedValue(SchedulingSettings settings, string settingName)
    {
        switch (settingName)
        {
            case "RootJobMinutes":
                settings.InactivityUndeployJobTimeouts.RootJobMinutes =
                    SchedulingDependencyInjectionExtensions.MaximumTimerDelayMinutes + 1;
                break;
            case "PerOrgJobMinutes":
                settings.InactivityUndeployJobTimeouts.PerOrgJobMinutes =
                    SchedulingDependencyInjectionExtensions.MaximumTimerDelayMinutes + 1;
                break;
            case "PerAppJobMinutes":
                settings.InactivityUndeployJobTimeouts.PerAppJobMinutes =
                    SchedulingDependencyInjectionExtensions.MaximumTimerDelayMinutes + 1;
                break;
            case "ChatRetentionDays":
                settings.ChatInactivityCleanup.RetentionDays =
                    SchedulingDependencyInjectionExtensions.MaximumRetentionDays + 1;
                break;
            case "RepositoryRetentionDays":
                settings.RepositoryCleanup.RetentionDays =
                    SchedulingDependencyInjectionExtensions.MaximumRetentionDays + 1;
                break;
            case "LockTimeoutSeconds":
                settings.RepositoryCleanup.LockTimeoutSeconds =
                    SchedulingDependencyInjectionExtensions.MaximumTimerDelaySeconds + 1;
                break;
            case "JobTimeoutMinutes":
                settings.RepositoryCleanup.JobTimeoutMinutes =
                    SchedulingDependencyInjectionExtensions.MaximumTimerDelayMinutes + 1;
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(settingName), settingName, null);
        }
    }
}
