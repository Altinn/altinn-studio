using LibGit2Sharp;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// A disposable app folder (repo-root layout with an <c>App/</c> subfolder) in the system temp
/// directory, for running the v8-to-v9 migrators against synthetic fixtures.
/// </summary>
internal sealed class TempAppFolder : IDisposable
{
    public string Root { get; }

    public TempAppFolder()
    {
        var path = Path.Combine(Path.GetTempPath(), "studioctl-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(path);
        Root = ResolvePhysicalPath(path);
    }

    /// <summary>
    /// The path with every symlinked segment resolved. On macOS the temp folder sits behind "/var",
    /// which links to "/private/var". Git resolves that, so a fixture holding the unresolved path makes
    /// repository-relative lookups miss every file - and any test of behaviour that runs against
    /// <c>HEAD</c> would quietly pass without exercising anything.
    /// </summary>
    private static string ResolvePhysicalPath(string path)
    {
        var resolved = Path.GetPathRoot(path);
        if (string.IsNullOrEmpty(resolved))
            return path;

        foreach (var segment in Path.GetRelativePath(resolved, path).Split(Path.DirectorySeparatorChar))
        {
            resolved = Path.Combine(resolved, segment);
            if (Directory.ResolveLinkTarget(resolved, returnFinalTarget: true) is { } target)
                resolved = target.FullName;
        }

        return resolved;
    }

    /// <summary>
    /// Turns the folder into a Git repository holding everything written so far, so that migrators
    /// which restore formatting against <c>HEAD</c> have something to compare with. Without this, a
    /// fixture exercises only the rewrite, never the restoration on top of it.
    /// </summary>
    public void CommitEverything()
    {
        Repository.Init(Root);
        using var repository = new Repository(Root);
        Commands.Stage(repository, "*");
        var author = new Signature("studioctl tests", "tests@example.com", DateTimeOffset.UnixEpoch);
        repository.Commit("fixture", author, author);
    }

    public string Write(string relativePath, string content)
    {
        var path = PreparePath(relativePath);
        File.WriteAllText(path, content);
        return path;
    }

    public string WriteBytes(string relativePath, byte[] content)
    {
        var path = PreparePath(relativePath);
        File.WriteAllBytes(path, content);
        return path;
    }

    private string PreparePath(string relativePath)
    {
        var path = Path.Combine(Root, "App", relativePath);
        if (Path.GetDirectoryName(path) is { } directory)
            Directory.CreateDirectory(directory);
        return path;
    }

    public string Read(string relativePath) => File.ReadAllText(Path.Combine(Root, "App", relativePath));

    public byte[] ReadBytes(string relativePath) => File.ReadAllBytes(Path.Combine(Root, "App", relativePath));

    public void Dispose()
    {
        try
        {
            Directory.Delete(Root, recursive: true);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            // Best-effort cleanup of temp state; leftovers are harmless. A recursive delete can also
            // hit UnauthorizedAccessException (e.g. a read-only file), which must not fail the run.
        }
    }
}
