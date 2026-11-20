using System;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

public static class AppActivityCollectionJobConstants
{
    public const string JobName = nameof(AppActivityCollectionJob);
    public const string TriggerName = $"{JobName}Trigger";
    public const string CronScheduleNightly = "0 0 2 * * ?";
    public const string JobDataOrgKey = "org";

    // The gateway accepts at most 30 days and Log Analytics retains 30 days.
    public const int InitialWindowDays = 29;
    public const int IncrementalWindowDays = 2;

    public static readonly JobKey JobKey = new(JobName);
    public static readonly TimeSpan JobTimeout = TimeSpan.FromHours(3);
}
