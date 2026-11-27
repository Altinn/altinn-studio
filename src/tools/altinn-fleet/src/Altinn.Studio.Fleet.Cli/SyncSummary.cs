using System.Globalization;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Sync;

namespace Altinn.Studio.Fleet.Cli;

/// <summary>Writes what a sync did: a line per environment, then a line per change and new failure.</summary>
internal static class SyncSummary
{
    private const string Separator = " · ";

    /// <param name="output">Where to write.</param>
    /// <param name="result">The environment's result.</param>
    /// <param name="startedAt">When the sync started. Failures from before it are counted, not listed.</param>
    public static void Write(TextWriter output, EnvironmentSyncResult result, DateTimeOffset startedAt)
    {
        string verb(string done, string planned) => result.DryRun ? planned : done;
        string[] counts =
        [
            $"{result.Deployed} deployed",
            $"{result.Unchanged} unchanged",
            $"{result.Updated} {verb("updated", "to update")}",
            $"{result.Added} {verb("added", "to add")}",
            $"{result.Removed} {verb("removed", "to remove")}",
            $"{result.Failures.Count} failed",
        ];
        output.WriteLine(
            $"{result.Environment.Name, -5} {(result.DryRun ? "dry run: " : "")}{string.Join(Separator, counts)}   {Duration(result.Duration)}"
        );

        var newFailures = result.Failures.Where(f => f.FailedAt >= startedAt).ToList();
        var rows = new List<(string Kind, string App, string Version, string Detail)>();
        foreach (AppChange change in result.Changes)
        {
            (string kind, string versions, string detail) = change switch
            {
                AppChange.Added added => ("added", added.Version.Value, Detail(added.Commit, added.Skipped)),
                AppChange.Updated updated => (
                    "updated",
                    $"{updated.From?.Value} → {updated.To.Value}",
                    Detail(updated.Commit, updated.Skipped)
                ),
                AppChange.Removed removed => (verb("removed", "remove"), removed.Version?.Value ?? "", ""),
                AppChange.ToFetch { From: null } add => ("add", add.To.Value, ""),
                AppChange.ToFetch update => ("update", $"{update.From?.Value} → {update.To.Value}", ""),
                _ => throw new InvalidOperationException($"Unknown change {change}"),
            };
            rows.Add((kind, change.App.ToString(), versions, detail));
        }

        rows.AddRange(newFailures.Select(f => ("failed", f.App.ToString(), f.Version.Value, f.Reason)));
        int appWidth = rows.Select(r => r.App.Length).DefaultIfEmpty(0).Max();
        int versionWidth = rows.Select(r => r.Version.Length).DefaultIfEmpty(0).Max();
        foreach ((string kind, string app, string version, string detail) in rows)
        {
            string line = $"  {kind, -8} {app.PadRight(appWidth)}   {version.PadRight(versionWidth)}   {detail}";
            output.WriteLine(line.TrimEnd());
        }

        int earlier = result.Failures.Count - newFailures.Count;
        if (earlier > 0)
        {
            output.WriteLine(
                $"  {Count(earlier, "app", "apps")} failed at the same version before. "
                    + "The index's failures table says why, and --retry-failed tries again."
            );
        }

        foreach (OrgFailure failure in result.DiscoveryFailures)
        {
            output.WriteLine($"  could not list the apps of {failure.Org}, so they were kept: {failure.Reason}");
        }

        foreach (string note in result.Notes)
        {
            output.WriteLine($"  {note}");
        }
    }

    private static string Detail(CommitSha commit, IReadOnlyList<SkippedEntry> skipped) =>
        skipped.Count == 0
            ? commit.Abbreviated
            : $"{commit.Abbreviated}   {Count(skipped.Count, "entry", "entries")} left out: "
                + string.Join(", ", skipped.Select(s => s.Reason).Distinct());

    internal static string Count(long count, string one, string many) =>
        string.Create(CultureInfo.InvariantCulture, $"{count} {(count == 1 ? one : many)}");

    internal static string Duration(TimeSpan duration) =>
        duration.TotalSeconds < 60
            ? string.Create(CultureInfo.InvariantCulture, $"{duration.TotalSeconds:0.0}s")
            : string.Create(CultureInfo.InvariantCulture, $"{(int)duration.TotalMinutes}m{duration.Seconds:00}s");
}
