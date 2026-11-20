using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Store;

namespace Altinn.Studio.Fleet.Sync;

/// <summary>A deployment the store does not have, and what the store has of the app instead.</summary>
/// <param name="Deployment">The deployment to download.</param>
/// <param name="Stored">The app as the index has it, or <c>null</c> when the store does not have it.</param>
internal sealed record PlannedFetch(AppDeployment Deployment, IndexedApp? Stored)
{
    public AppIdentifier App => Deployment.App;
}

/// <summary>What a sync must do to an environment's folder to match what runs, before any request about releases.</summary>
/// <param name="ToFetch">The deployments the store does not have, to download.</param>
/// <param name="ToRemove">The apps the store has that no longer run.</param>
/// <param name="KnownFailures">Deployments that failed before at the same version, which are not tried again.</param>
/// <param name="ClearedFailures">Recorded failures that no longer apply.</param>
/// <param name="Unchanged">How many deployments the store has at their deployed version.</param>
internal sealed record SyncPlan(
    List<PlannedFetch> ToFetch,
    List<IndexedApp> ToRemove,
    List<AppFailure> KnownFailures,
    List<AppIdentifier> ClearedFailures,
    int Unchanged
)
{
    /// <summary>Whether the sync has nothing to write.</summary>
    public bool IsEmpty => ToFetch.Count == 0 && ToRemove.Count == 0 && ClearedFailures.Count == 0;

    /// <summary>Compares what runs with what the index has.</summary>
    /// <param name="discovery">What runs. Service owners whose discovery failed keep what they have.</param>
    /// <param name="indexed">The apps the index has.</param>
    /// <param name="failures">The failures the index has recorded.</param>
    /// <param name="orgFilter">The service owners the sync covers, or <c>null</c> for all.</param>
    /// <param name="retryFailed">Whether to try deployments again that failed before at the same version.</param>
    /// <param name="existsOnDisk">Whether an app's folder exists, so that a missing one is fetched again.</param>
    public static SyncPlan Create(
        DiscoveryResult discovery,
        IReadOnlyDictionary<AppIdentifier, IndexedApp> indexed,
        IReadOnlyDictionary<AppIdentifier, AppFailure> failures,
        IReadOnlySet<ServiceOwnerCode>? orgFilter,
        bool retryFailed,
        Func<AppIdentifier, bool> existsOnDisk
    )
    {
        var toFetch = new List<PlannedFetch>();
        var knownFailures = new List<AppFailure>();
        var cleared = new List<AppIdentifier>();
        var deployed = new HashSet<AppIdentifier>();
        int unchanged = 0;

        foreach (AppDeployment deployment in discovery.Deployments)
        {
            AppIdentifier app = deployment.App;
            deployed.Add(app);
            indexed.TryGetValue(app, out IndexedApp? stored);
            failures.TryGetValue(app, out AppFailure? failure);
            if (stored?.Release?.Version == deployment.Version && existsOnDisk(app))
            {
                unchanged++;
                if (failure is not null)
                {
                    cleared.Add(app);
                }
            }
            else if (failure?.Version == deployment.Version && failure.Kind == FailureKind.Unavailable && !retryFailed)
            {
                knownFailures.Add(failure);
            }
            else
            {
                toFetch.Add(new PlannedFetch(deployment, stored));
            }
        }

        var failedOrgs = new HashSet<string>(discovery.Failures.Select(f => f.Org), StringComparer.Ordinal);
        bool InScope(AppIdentifier app) =>
            (orgFilter is null || orgFilter.Contains(app.Org))
            && !failedOrgs.Contains(app.Org.Value)
            && !deployed.Contains(app);

        var toRemove = indexed.Values.Where(a => InScope(a.App)).ToList();
        cleared.AddRange(failures.Keys.Where(app => InScope(app) && !indexed.ContainsKey(app)));

        toFetch.Sort((x, y) => Compare(x.App, y.App));
        toRemove.Sort((x, y) => Compare(x.App, y.App));
        return new SyncPlan(toFetch, toRemove, knownFailures, cleared, unchanged);
    }

    internal static int Compare(AppIdentifier x, AppIdentifier y)
    {
        int org = string.CompareOrdinal(x.Org.Value, y.Org.Value);
        return org != 0 ? org : string.CompareOrdinal(x.App.Value, y.App.Value);
    }
}
