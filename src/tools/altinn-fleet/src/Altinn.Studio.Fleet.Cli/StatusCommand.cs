using Altinn.Studio.Common.Domain;
using Altinn.Studio.Fleet.Store;
using Altinn.Studio.Fleet.Sync;

namespace Altinn.Studio.Fleet.Cli;

/// <summary><c>fleet status</c>.</summary>
internal static class StatusCommand
{
    public static int Run(Arguments args, FleetStore store, TextWriter output)
    {
        string? env = args.Value("env");
        args.RejectUnused();
        output.WriteLine($"Store: {store.Root}");
        foreach (RuntimeEnvironment environment in Cli.Environments(env ?? "all"))
        {
            string name = $"{environment.Name, -5}";
            if (FleetStoreReader.GetStatus(store, environment) is not EnvironmentStatus.Synced status)
            {
                output.WriteLine($"{name} not synced");
                continue;
            }

            output.WriteLine(
                $"{name} {SyncSummary.Count(status.Apps, "app", "apps")} · "
                    + $"{SyncSummary.Count(status.Orgs, "service owner", "service owners")} · {status.Failures} failed   "
                    + $"content changed {Time(status.LastContentChange)}"
            );
            CheckState? check = status.LastCheck;
            if (check is null)
            {
                output.WriteLine("      not checked from this store");
                continue;
            }

            output.WriteLine(
                $"      checked {Time(check.CheckedAt)}: {check.Deployed} deployed, {check.Failed} failed"
            );
            foreach (OrgFailure failure in check.DiscoveryFailures)
            {
                output.WriteLine($"      could not list the apps of {failure.Org}: {failure.Reason}");
            }
        }

        return 0;
    }

    private static string Time(DateTimeOffset? time) => time is { } value ? FormatTime(value) : "unknown";

    private static string FormatTime(DateTimeOffset time)
    {
        TimeSpan age = DateTimeOffset.UtcNow - time;
        string ago =
            age.TotalMinutes < 1 ? "just now"
            : age.TotalHours < 1 ? $"{(int)age.TotalMinutes} min ago"
            : age.TotalDays < 1 ? $"{(int)age.TotalHours} h ago"
            : $"{(int)age.TotalDays} days ago";
        return $"{time.ToLocalTime():yyyy-MM-dd HH:mm} ({ago})";
    }
}
