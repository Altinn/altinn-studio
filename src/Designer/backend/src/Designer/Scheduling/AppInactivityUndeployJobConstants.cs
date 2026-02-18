using System;

namespace Altinn.Studio.Designer.Scheduling;

public static class AppInactivityUndeployJobConstants
{
    public const string JobName = nameof(AppInactivityUndeployJob);
    public const string JobGroup = "AppInactivityUndeployJobGroup";
    public const string TriggerName = $"{JobName}Trigger";
    public const string TriggerGroup = JobGroup;
    public const string CronScheduleNightlyMidnight = "0 0 0 * * ?";

    public const string PerOrgJobName = "AppInactivityUndeployPerOrgJob";
    public const string PerOrgJobGroup = "AppInactivityUndeployPerOrgJobGroup";
    public const string PerOrgTriggerNamePrefix = "AppInactivityUndeployPerOrgTrigger-";
    public const string PerOrgTriggerGroup = PerOrgJobGroup;
    public const string JobDataOrgKey = "org";
    public const string JobDataEnvironmentFilterKey = "environment_filter";

    public const string PerAppJobName = "AppInactivityUndeployAppJob";
    public const string PerAppJobGroup = "AppInactivityUndeployAppJobGroup";
    public const string PerAppTriggerNamePrefix = "AppInactivityUndeployAppTrigger-";
    public const string PerAppTriggerGroup = PerAppJobGroup;
    public const string JobDataAppKey = "app";
    public const string JobDataEnvironmentKey = "environment";
    public const string SystemDeveloper = "System";

    public const int PerAppBaseDelaySeconds = 120;

    public static readonly string[] TargetEnvironments = ["at22", "at23", "at24", "tt02", "yt01"];

    public static bool IsTargetEnvironment(string environment)
    {
        foreach (var targetEnvironment in TargetEnvironments)
        {
            if (string.Equals(targetEnvironment, environment, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    public static string BuildPerOrgIdentitySuffix(string org, string? environmentFilter)
    {
        return string.IsNullOrWhiteSpace(environmentFilter)
            ? org
            : $"{org}-{environmentFilter.ToLowerInvariant()}";
    }
}
