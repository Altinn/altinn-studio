using System.Collections.Generic;
using Altinn.Studio.Designer.Models.ContactPoints;

namespace Altinn.Studio.Designer.Scheduling;

public static class PeriodicReportJobConstants
{
    public const string JobName = nameof(PeriodicReportJob);
    public const string FrequencyKey = "frequency";
    public const string TimeZoneId = "Europe/Oslo";

    public static readonly IReadOnlyDictionary<ReportFrequency, string> CronSchedules = new Dictionary<
        ReportFrequency,
        string
    >
    {
        [ReportFrequency.Daily] = "0 0 7 * * ?",
        [ReportFrequency.Weekly] = "0 0 7 ? * MON",
        [ReportFrequency.Monthly] = "0 0 7 1 * ?",
    };

    public static string TriggerName(ReportFrequency frequency) => $"{JobName}{frequency}Trigger";
}
