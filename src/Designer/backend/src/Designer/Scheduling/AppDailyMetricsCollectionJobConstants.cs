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

    public static readonly JobKey JobKey = new(JobName);
    public static readonly TimeSpan JobTimeout = TimeSpan.FromHours(3);
}
