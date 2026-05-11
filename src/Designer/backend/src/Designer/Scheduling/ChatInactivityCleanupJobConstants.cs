namespace Altinn.Studio.Designer.Scheduling;

public static class ChatInactivityCleanupJobConstants
{
    public const string JobName = nameof(ChatInactivityCleanupJob);
    public const string TriggerName = $"{JobName}Trigger";
    public const string CronScheduleNightly = "0 0 1 * * ?";
}
