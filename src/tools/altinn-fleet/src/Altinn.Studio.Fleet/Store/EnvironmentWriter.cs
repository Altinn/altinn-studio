using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Sync;

namespace Altinn.Studio.Fleet.Store;

/// <summary>An app extracted to a temporary folder, ready to be moved into the environment's folder.</summary>
internal sealed record StagedApp(
    AppIdentifier App,
    StoredRelease Release,
    string StagedPath,
    AppFiles Files,
    AppDescription Description
);

/// <summary>
/// Changes an environment's folder and its index together, behind a journal, so that <see cref="Recover"/> can finish
/// a commit that was interrupted.
/// </summary>
internal sealed class EnvironmentWriter : IDisposable
{
    private readonly FleetStore _store;
    private readonly RuntimeEnvironment _environment;
    private readonly FleetIndex _index;
    private readonly string _runFolder;
    private readonly TimeProvider _time;
    private int _trashCount;

    private EnvironmentWriter(
        FleetStore store,
        RuntimeEnvironment environment,
        FleetIndex index,
        string runFolder,
        TimeProvider time
    )
    {
        _store = store;
        _environment = environment;
        _index = index;
        _runFolder = runFolder;
        _time = time;
    }

    /// <summary>Whether a commit has changed the environment's folder or index.</summary>
    public bool Changed { get; private set; }

    public static EnvironmentWriter Open(
        FleetStore store,
        RuntimeEnvironment environment,
        string runFolder,
        string toolVersion,
        TimeProvider time
    )
    {
        CreateDirectory(store.EnvironmentPath(environment));
        CreateDirectory(store.AppsPath(environment));
        FleetIndex index = FleetIndex.OpenReadWrite(store.IndexPath(environment), environment, toolVersion);
        return new EnvironmentWriter(store, environment, index, runFolder, time);
    }

    public FleetIndex Index => _index;

    /// <summary>Moves staged apps in and removed apps out, and records them and the failures in the index.</summary>
    public void Commit(
        IReadOnlyList<StagedApp> puts,
        IReadOnlyList<AppIdentifier> removes,
        IReadOnlyCollection<AppFailure> failures,
        IReadOnlyCollection<AppIdentifier> clearedFailures
    )
    {
        bool moves = puts.Count > 0 || removes.Count > 0;
        if (!moves && failures.Count == 0 && clearedFailures.Count == 0)
        {
            return;
        }

        if (moves)
        {
            _store.WriteJournal(
                _environment,
                new CommitJournal(
                    _runFolder,
                    [.. puts.Select(p => JournalPut.From(p))],
                    [.. removes.Select(app => new JournalRemove(app.Org.Value, app.App.Value))]
                )
            );
            foreach (StagedApp put in puts)
            {
                MoveIn(put.App, put.StagedPath);
            }

            foreach (AppIdentifier app in removes)
            {
                MoveOut(app);
            }
        }

        _index.Write(
            [.. puts.Select(p => new IndexedAppContent(new IndexedApp(p.App, p.Release), p.Files, p.Description))],
            removes,
            failures,
            clearedFailures,
            moves ? _time.GetUtcNow() : null
        );
        Changed = true;
        if (moves)
        {
            _store.DeleteJournal(_environment);
            EmptyTrash();
        }
    }

    /// <summary>Finishes a commit that an interrupted run left a journal for.</summary>
    public static void Recover(FleetStore store, RuntimeEnvironment environment, string toolVersion, TimeProvider time)
    {
        CommitJournal? journal = store.ReadJournal(environment);
        if (journal is null)
        {
            return;
        }

        using EnvironmentWriter writer = Open(store, environment, journal.RunFolder, toolVersion, time);
        var contents = new List<IndexedAppContent>();
        using var tree = new AppTree();
        foreach (JournalPut put in journal.Puts)
        {
            (AppIdentifier app, StoredRelease release) = put.Parse();
            writer.MoveIn(app, put.Staged);
            string path = store.AppPath(environment, app);
            if (!Directory.Exists(path))
            {
                continue;
            }

            var reader = new AppDescriptionReader();
            AppFiles files = tree.Scan(path, reader, CancellationToken.None);
            contents.Add(
                new IndexedAppContent(
                    new IndexedApp(app, release),
                    files with
                    {
                        Skipped = put.Skipped,
                    },
                    reader.Build()
                )
            );
        }

        var removes = new List<AppIdentifier>();
        foreach (JournalRemove remove in journal.Removes)
        {
            AppIdentifier app = AppIdentifier.TryParse(remove.Org, remove.App, out AppIdentifier parsed)
                ? parsed
                : throw JournalPut.Unreadable(store, environment);
            writer.MoveOut(app);
            removes.Add(app);
        }

        writer._index.Write(contents, removes, [], [], time.GetUtcNow());
        store.DeleteJournal(environment);
        writer.EmptyTrash();
        Readme.Write(store, environment, writer._index);
    }

    public void Dispose() => _index.Dispose();

    // Idempotent, so that recovery can repeat it: the staged folder is gone once it has been moved in.
    private void MoveIn(AppIdentifier app, string staged)
    {
        if (!Directory.Exists(staged))
        {
            return;
        }

        string target = _store.AppPath(_environment, app);
        CreateDirectory(_store.OrgPath(_environment, app.Org));
        if (Directory.Exists(target))
        {
            Directory.Move(target, NextTrashPath());
        }

        Directory.Move(staged, target);
    }

    private void MoveOut(AppIdentifier app)
    {
        string target = _store.AppPath(_environment, app);
        if (Directory.Exists(target))
        {
            Directory.Move(target, NextTrashPath());
        }

        string org = _store.OrgPath(_environment, app.Org);
        if (Directory.Exists(org) && !Directory.EnumerateFileSystemEntries(org).Any())
        {
            Directory.Delete(org);
        }
    }

    private string NextTrashPath()
    {
        string trash = Path.Join(_runFolder, "trash");
        Directory.CreateDirectory(trash);
        return Path.Join(trash, (++_trashCount).ToString(System.Globalization.CultureInfo.InvariantCulture));
    }

    private void EmptyTrash()
    {
        string trash = Path.Join(_runFolder, "trash");
        if (Directory.Exists(trash))
        {
            Directory.Delete(trash, recursive: true);
        }
    }

    internal static void CreateDirectory(string path)
    {
        if (Directory.Exists(path))
        {
            return;
        }

        if (OperatingSystem.IsWindows())
        {
            Directory.CreateDirectory(path);
            return;
        }

        const UnixFileMode mode =
            UnixFileMode.UserRead
            | UnixFileMode.UserWrite
            | UnixFileMode.UserExecute
            | UnixFileMode.GroupRead
            | UnixFileMode.GroupExecute
            | UnixFileMode.OtherRead
            | UnixFileMode.OtherExecute;
        Directory.CreateDirectory(path, mode);
        File.SetUnixFileMode(path, mode);
    }
}
