namespace Altinn.Studio.AppConfig.Tests;

internal static class RepoFiles
{
    private static readonly Lazy<string> _root = new(Locate);

    public static string Path(params string[] segments) => System.IO.Path.Combine([_root.Value, .. segments]);

    private static string Locate()
    {
        var dir = AppContext.BaseDirectory;
        while (!string.IsNullOrEmpty(dir))
        {
            if (File.Exists(System.IO.Path.Combine(dir, "src", "cli", "studioctl.slnx")))
                return dir;
            var parent = Directory.GetParent(dir)?.FullName;
            if (parent == dir || parent is null)
                break;
            dir = parent;
        }
        throw new InvalidOperationException($"could not locate the repository root from {AppContext.BaseDirectory}");
    }
}
