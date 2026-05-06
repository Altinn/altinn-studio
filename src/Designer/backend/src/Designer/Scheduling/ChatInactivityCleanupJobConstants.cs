namespace Altinn.Studio.Designer.Scheduling;

public static class ChatInactivityCleanupJobConstants
{
    public const string JobName = nameof(ChatInactivityCleanupJob);
    public const string JobGroup = "ChatInactivityCleanupJobGroup";
    public const string TriggerName = $"{JobName}Trigger";
    public const string TriggerGroup = JobGroup;
    public const string CronScheduleNightlyMidnight = "0 0 0 * * ?";
    public const int MaxInactivityDays = 30;
}
