using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Sync;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Store;

/// <summary>
/// Builds an environment's index again from the app folders on disk, without downloading anything. It keeps what
/// only the old index knows, such as each app's version and commit, when the old index can still be read.
/// </summary>
internal static class IndexRebuilder
{
    public static async Task<int> Rebuild(
        FleetStore store,
        RuntimeEnvironment environment,
        string toolVersion,
        int parallelism,
        Action<int, int> onProgress,
        TimeProvider time,
        CancellationToken cancellationToken
    )
    {
        string indexPath = store.IndexPath(environment);
        Dictionary<AppIdentifier, IndexedApp> apps = [];
        Dictionary<AppIdentifier, AppFailure> failures = [];
        Dictionary<AppIdentifier, List<SkippedEntry>> skipped = [];
        string? lastChange = null;
        try
        {
            using FleetIndex? old = FleetIndex.OpenReadOnly(indexPath);
            if (old is not null)
            {
                lastChange = old.ReadMeta("last_content_change");
                apps = old.ReadApps();
                failures = old.ReadFailures();
                skipped = old.ReadSkipped();
            }
        }
        catch (SqliteException)
        {
            // An index this old or broken has nothing to keep.
        }

        List<AppIdentifier> onDisk = ListApps(store.AppsPath(environment));
        var contents = new IndexedAppContent[onDisk.Count];
        int done = 0;
        onProgress(0, onDisk.Count);
        await Parallel.ForAsync(
            0,
            onDisk.Count,
            new ParallelOptions { MaxDegreeOfParallelism = parallelism, CancellationToken = cancellationToken },
            (i, token) =>
            {
                AppIdentifier app = onDisk[i];
                var reader = new AppDescriptionReader();
                using var tree = new AppTree();
                AppFiles files = tree.Scan(store.AppPath(environment, app), reader, token);
                IndexedApp indexed = apps.GetValueOrDefault(app) ?? new IndexedApp(app, null);
                contents[i] = new IndexedAppContent(
                    indexed,
                    files with
                    {
                        Skipped = [.. skipped.GetValueOrDefault(app) ?? [], .. files.Skipped],
                    },
                    reader.Build()
                );
                onProgress(Interlocked.Increment(ref done), onDisk.Count);
                return ValueTask.CompletedTask;
            }
        );

        Directory.CreateDirectory(store.TempPath);
        string temporary = Path.Join(store.TempPath, $"{environment.Name}-index-{Guid.NewGuid():N}.sqlite");
        using (FleetIndex index = FleetIndex.OpenReadWrite(temporary, environment, toolVersion))
        {
            var kept = failures
                .Values.Where(f => apps.GetValueOrDefault(f.App)?.Release?.Version != f.Version)
                .ToList();
            index.Write(contents, [], kept, [], FleetIndex.ParseTime(lastChange) ?? time.GetUtcNow());
        }

        EnvironmentWriter.CreateDirectory(store.EnvironmentPath(environment));
        // A journal left by the old index would be applied to the new one.
        File.Delete(indexPath + "-journal");
        File.Move(temporary, indexPath, overwrite: true);
        using (
            FleetIndex index = FleetIndex.OpenReadOnly(indexPath) ?? throw new FleetException($"{indexPath} is gone.")
        )
        {
            Readme.Write(store, environment, index);
        }

        return contents.Length;
    }

    /// <summary>The app folders under <c>apps/&lt;org&gt;/&lt;app&gt;</c> whose names are valid.</summary>
    internal static List<AppIdentifier> ListApps(string appsPath)
    {
        var apps = new List<AppIdentifier>();
        if (!Directory.Exists(appsPath))
        {
            return apps;
        }

        foreach (string orgPath in Directory.EnumerateDirectories(appsPath))
        {
            string org = Path.GetFileName(orgPath);
            foreach (string appPath in Directory.EnumerateDirectories(orgPath))
            {
                if (AppIdentifier.TryParse(org, Path.GetFileName(appPath), out AppIdentifier app))
                {
                    apps.Add(app);
                }
            }
        }

        apps.Sort(SyncPlan.Compare);
        return apps;
    }
}
