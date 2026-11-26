using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;

namespace Altinn.Studio.Fleet.Sync;

/// <summary>What a sync of one environment did, or with a dry run, what it would do.</summary>
/// <param name="Environment">The environment.</param>
/// <param name="DryRun">Whether this was a dry run, which changed nothing.</param>
/// <param name="Deployed">How many apps the covered service owners run, as far as discovery could tell.</param>
/// <param name="Unchanged">How many of them the store already had at their deployed version.</param>
/// <param name="Changes">The apps added, updated or removed, ordered by app.</param>
/// <param name="Failures">
/// The deployed apps the store does not have at their deployed version, because fetching them failed in this run or
/// an earlier one.
/// </param>
/// <param name="DiscoveryFailures">The service owners whose apps could not be listed, and were kept as they were.</param>
/// <param name="Notes">Other things the sync wants its reader to know, such as an installation it had no key for.</param>
/// <param name="Duration">How long the sync of the environment took.</param>
public sealed record EnvironmentSyncResult(
    RuntimeEnvironment Environment,
    bool DryRun,
    int Deployed,
    int Unchanged,
    IReadOnlyList<AppChange> Changes,
    IReadOnlyList<AppFailure> Failures,
    IReadOnlyList<OrgFailure> DiscoveryFailures,
    IReadOnlyList<string> Notes,
    TimeSpan Duration
)
{
    /// <summary>How many apps were added, or would be.</summary>
    public int Added => Changes.Count(c => c is AppChange.Added or AppChange.ToFetch { From: null });

    /// <summary>How many apps were updated to another version, or would be.</summary>
    public int Updated => Changes.Count(c => c is AppChange.Updated or AppChange.ToFetch { From: not null });

    /// <summary>How many apps were removed because they no longer run, or would be.</summary>
    public int Removed => Changes.Count(c => c is AppChange.Removed);
}

/// <summary>What a sync did to an app, or with a dry run, would do.</summary>
public abstract record AppChange
{
    private AppChange(AppIdentifier app)
    {
        App = app;
    }

    /// <summary>The app.</summary>
    public AppIdentifier App { get; }

    /// <summary>The app was not in the store before.</summary>
    /// <param name="App">The app.</param>
    /// <param name="Version">The version the store has now.</param>
    /// <param name="Commit">The commit the version was released from.</param>
    /// <param name="Skipped">The archive entries that were not extracted, and why.</param>
    public sealed record Added(
        AppIdentifier App,
        AppVersion Version,
        CommitSha Commit,
        IReadOnlyList<SkippedEntry> Skipped
    ) : AppChange(App);

    /// <summary>The store had another version of the app, or one it did not know.</summary>
    /// <param name="App">The app.</param>
    /// <param name="From">The version the store had, or <c>null</c> when its index did not know it.</param>
    /// <param name="To">The version the store has now.</param>
    /// <param name="Commit">The commit the version was released from.</param>
    /// <param name="Skipped">The archive entries that were not extracted, and why.</param>
    public sealed record Updated(
        AppIdentifier App,
        AppVersion? From,
        AppVersion To,
        CommitSha Commit,
        IReadOnlyList<SkippedEntry> Skipped
    ) : AppChange(App);

    /// <summary>The app no longer runs, so it was removed.</summary>
    /// <param name="App">The app.</param>
    /// <param name="Version">The version the store had, or <c>null</c> when its index did not know it.</param>
    public sealed record Removed(AppIdentifier App, AppVersion? Version) : AppChange(App);

    /// <summary>In a dry run, a version a sync would download.</summary>
    /// <param name="App">The app.</param>
    /// <param name="From">The version the store has, or <c>null</c> when it does not have the app.</param>
    /// <param name="To">The deployed version.</param>
    public sealed record ToFetch(AppIdentifier App, AppVersion? From, AppVersion To) : AppChange(App);
}

/// <summary>A deployed version of an app that the store does not have.</summary>
/// <param name="App">The app.</param>
/// <param name="Version">The deployed version that could not be fetched.</param>
/// <param name="Kind">Whether the failure is likely to last.</param>
/// <param name="Reason">Why, in a few words.</param>
/// <param name="FailedAt">When it failed.</param>
public sealed record AppFailure(
    AppIdentifier App,
    AppVersion Version,
    FailureKind Kind,
    string Reason,
    DateTimeOffset FailedAt
);

/// <summary>Whether a failure is likely to last, which decides whether the next sync tries again.</summary>
public enum FailureKind
{
    /// <summary>
    /// No release of the version was found, or the repository or commit cannot be downloaded, such as a private
    /// repository. A sync tries again when the deployed version changes, or when asked to.
    /// </summary>
    Unavailable,

    /// <summary>A network error or a server error. The next sync tries again.</summary>
    Error,
}

/// <summary>A service owner whose apps could not be listed.</summary>
/// <param name="Org">The service owner.</param>
/// <param name="Reason">Why.</param>
public sealed record OrgFailure(string Org, string Reason);

/// <summary>An archive entry that was not extracted.</summary>
/// <param name="Path">The entry's path in the app.</param>
/// <param name="Reason">Why, such as a symbolic link or a file named <c>.env</c>.</param>
public sealed record SkippedEntry(string Path, string Reason);
