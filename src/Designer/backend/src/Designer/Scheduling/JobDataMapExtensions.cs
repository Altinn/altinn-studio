using System;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

internal static class JobDataMapExtensions
{
    public static string? GetOptionalString(this JobDataMap jobDataMap, string key)
    {
        ArgumentNullException.ThrowIfNull(jobDataMap);
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new ArgumentException("Value cannot be null or whitespace.", nameof(key));
        }

        if (!jobDataMap.TryGetValue(key, out var value) || value is null)
        {
            return null;
        }

        return value as string ?? value.ToString();
    }

    public static string GetRequiredString(this JobDataMap jobDataMap, string key)
    {
        var value = jobDataMap.GetOptionalString(key);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"Missing required Quartz job data key '{key}'.");
        }

        return value;
    }
}
