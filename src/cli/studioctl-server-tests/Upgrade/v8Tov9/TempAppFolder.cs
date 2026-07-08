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
        Root = Path.Combine(Path.GetTempPath(), "studioctl-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Root);
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
