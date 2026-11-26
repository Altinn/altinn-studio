using System.Text.Json;
using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;

namespace Altinn.Studio.Fleet.Store;

/// <summary>
/// The folder with a folder per environment. An environment's folder holds only what a copy of it needs, so the
/// store's own bookkeeping lives in <c>.fleet</c> beside them.
/// </summary>
public sealed class FleetStore
{
    private const string BookkeepingFolder = ".fleet";

    /// <summary>Opens the store in a folder, which need not exist yet.</summary>
    public FleetStore(string root)
    {
        Root = Path.GetFullPath(root);
    }

    /// <summary>The store's folder.</summary>
    public string Root { get; }

    /// <summary><c>~/altinn-fleet</c>.</summary>
    public static string DefaultRoot =>
        Path.Join(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "altinn-fleet");

    /// <summary>The folder of an environment.</summary>
    public string EnvironmentPath(RuntimeEnvironment environment) => Path.Join(Root, environment.Name);

    /// <summary>The folder that holds a folder per service owner, which holds a folder per app.</summary>
    public string AppsPath(RuntimeEnvironment environment) => Path.Join(EnvironmentPath(environment), "apps");

    /// <summary>The folder of a service owner's apps.</summary>
    public string OrgPath(RuntimeEnvironment environment, ServiceOwnerCode org) =>
        Path.Join(AppsPath(environment), org.Value);

    /// <summary>The folder of an app.</summary>
    public string AppPath(RuntimeEnvironment environment, AppIdentifier app) =>
        Path.Join(OrgPath(environment, app.Org), app.App.Value);

    /// <summary>The environment's index.</summary>
    public string IndexPath(RuntimeEnvironment environment) => Path.Join(EnvironmentPath(environment), "index.sqlite");

    internal string ReadmePath(RuntimeEnvironment environment) => Path.Join(EnvironmentPath(environment), "README.md");

    internal string BookkeepingPath => Path.Join(Root, BookkeepingFolder);

    internal string TempPath => Path.Join(BookkeepingPath, "tmp");

    internal string CheckStatePath(RuntimeEnvironment environment) =>
        Path.Join(BookkeepingPath, $"{environment.Name}.check.json");

    internal string JournalPath(RuntimeEnvironment environment) =>
        Path.Join(BookkeepingPath, $"{environment.Name}.journal.json");

    /// <summary>
    /// Takes the store's lock, which keeps a second sync or rebuild out until the returned object is disposed. The
    /// operating system releases it if the process dies.
    /// </summary>
    /// <exception cref="FleetException">Another process holds the lock.</exception>
    public IDisposable Lock()
    {
        Directory.CreateDirectory(BookkeepingPath);
        string path = Path.Join(BookkeepingPath, "lock");
        try
        {
            // FileShare.None takes an exclusive advisory lock on Unix as well as on Windows.
            return new FileStream(path, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
        }
        catch (IOException ex)
        {
            throw new FleetException($"Another sync is using the store at {Root}. Wait for it to finish.", ex);
        }
    }

    /// <summary>When an environment was last checked, and what that check found, or <c>null</c>.</summary>
    public CheckState? ReadCheckState(RuntimeEnvironment environment)
    {
        try
        {
            using FileStream stream = File.OpenRead(CheckStatePath(environment));
            return JsonSerializer.Deserialize(stream, FleetJsonContext.Default.CheckState);
        }
        catch (Exception ex) when (ex is IOException or JsonException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    internal void WriteCheckState(RuntimeEnvironment environment, CheckState state) =>
        WriteAtomically(
            CheckStatePath(environment),
            JsonSerializer.SerializeToUtf8Bytes(state, FleetJsonContext.Default.CheckState)
        );

    internal CommitJournal? ReadJournal(RuntimeEnvironment environment)
    {
        string path = JournalPath(environment);
        if (!File.Exists(path))
        {
            return null;
        }

        try
        {
            using FileStream stream = File.OpenRead(path);
            return JsonSerializer.Deserialize(stream, FleetJsonContext.Default.CommitJournal);
        }
        catch (JsonException ex)
        {
            throw new FleetException($"Cannot read {path}. Run `fleet index rebuild` after deleting it.", ex);
        }
    }

    internal void WriteJournal(RuntimeEnvironment environment, CommitJournal journal) =>
        WriteAtomically(
            JournalPath(environment),
            JsonSerializer.SerializeToUtf8Bytes(journal, FleetJsonContext.Default.CommitJournal)
        );

    internal void DeleteJournal(RuntimeEnvironment environment) => File.Delete(JournalPath(environment));

    /// <summary>Creates a new folder for one run's temporary files, on the same file system as the store.</summary>
    internal string CreateRunFolder(RuntimeEnvironment environment)
    {
        string path = Path.Join(TempPath, $"{environment.Name}-{Guid.NewGuid():N}");
        Directory.CreateDirectory(path);
        return path;
    }

    /// <summary>Deletes what interrupted runs left in the temporary folder. Only call it with the lock held.</summary>
    internal void ClearTemp()
    {
        if (Directory.Exists(TempPath))
        {
            Directory.Delete(TempPath, recursive: true);
        }
    }

    // Writes beside the file and renames over it, so that a reader never sees half a file.
    internal static void WriteAtomically(string path, ReadOnlySpan<byte> content)
    {
        if (Path.GetDirectoryName(path) is { Length: > 0 } directory)
        {
            Directory.CreateDirectory(directory);
        }

        string temporary = $"{path}.{Guid.NewGuid():N}.tmp";
        using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write))
        {
            stream.Write(content);
            stream.Flush(flushToDisk: true);
        }

        File.Move(temporary, path, overwrite: true);
    }
}

/// <summary>What the last check of an environment found. It is kept outside the environment's folder.</summary>
/// <param name="CheckedAt">When the check ended.</param>
/// <param name="Deployed">How many apps were deployed.</param>
/// <param name="Failed">How many deployed apps the store does not have at their deployed version.</param>
/// <param name="DiscoveryFailures">The service owners whose apps could not be listed.</param>
public sealed record CheckState(
    DateTimeOffset CheckedAt,
    int Deployed,
    int Failed,
    IReadOnlyList<Sync.OrgFailure> DiscoveryFailures
);

/// <summary>
/// The changes a commit is about to make to an environment's folder, written before it moves any folder and deleted
/// once the index has them. A run that finds it finishes the commit.
/// </summary>
internal sealed record CommitJournal(string RunFolder, List<JournalPut> Puts, List<JournalRemove> Removes);

internal sealed record JournalPut(
    string Org,
    string App,
    string Version,
    string Commit,
    string StudioHost,
    DateTimeOffset ReleasedAt,
    DateTimeOffset FetchedAt,
    string Staged,
    List<Sync.SkippedEntry> Skipped
)
{
    public static JournalPut From(StagedApp staged) =>
        new(
            staged.App.Org.Value,
            staged.App.App.Value,
            staged.Release.Version.Value,
            staged.Release.Commit.Value,
            staged.Release.StudioHost.Value,
            staged.Release.ReleasedAt,
            staged.Release.FetchedAt,
            staged.StagedPath,
            staged.Files.Skipped
        );

    /// <summary>The app and its release, which this tool wrote, so anything else means the journal is damaged.</summary>
    public (AppIdentifier App, StoredRelease Release) Parse() =>
        AppIdentifier.TryParse(Org, App, out AppIdentifier app)
        && AppVersion.TryParse(Version, out AppVersion version)
        && CommitSha.TryParse(Commit, out CommitSha commit)
        && HostName.TryParse(StudioHost, out HostName? host)
            ? (app, new StoredRelease(version, commit, host, ReleasedAt, FetchedAt))
            : throw new FleetException(
                $"A journal entry for {Org}/{App} is damaged. Delete the journal and run `fleet index rebuild`."
            );

    public static FleetException Unreadable(FleetStore store, RuntimeEnvironment environment) =>
        new($"{store.JournalPath(environment)} is damaged. Delete it and run `fleet index rebuild`.");
}

internal sealed record JournalRemove(string Org, string App);
