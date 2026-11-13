using System;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

public static class AppDailyMetricsCollectionJobConstants
{
    public const string JobName = nameof(AppDailyMetricsCollectionJob);
    public const string TriggerName = $"{JobName}Trigger";

    // After AppActivityCollectionJob at 02:00, so that the two nightly collections do not compete.
    public const string CronScheduleNightly = "0 30 2 * * ?";
    public const string JobDataOrgKey = "org";

    /// <summary>
    /// Optional job data: the UTC day to collect, as yyyy-MM-dd. Defaults to yesterday.
    /// </summary>
    public const string JobDataDateKey = "date";

    /// <summary>
    /// The environments whose metrics the admin pages show. The test environments are left out: nobody follows
    /// KPIs for them, and each would cost one Storage call per org per night.
    /// </summary>
    public static readonly string[] TargetEnvironments = ["production", "prod", "tt02"];

    public static bool IsTargetEnvironment(string environment) =>
        Array.Exists(
            TargetEnvironments,
            target => string.Equals(target, environment, StringComparison.OrdinalIgnoreCase)
        );

    public static readonly JobKey JobKey = new(JobName);
    public static readonly TimeSpan JobTimeout = TimeSpan.FromHours(3);
}
