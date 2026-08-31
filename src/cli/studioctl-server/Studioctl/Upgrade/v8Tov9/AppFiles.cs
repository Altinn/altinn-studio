namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Resolves files under an app directory, tolerating both layouts the upgrade pipeline is invoked
/// with: the repo app root (containing an <c>App/</c> folder) or the <c>App/</c> folder itself.
/// </summary>
internal static class AppFiles
{
    public static string? Resolve(string projectFolder, string relativePath)
    {
        var candidates = new[]
        {
            Path.Combine(projectFolder, "App", relativePath),
            Path.Combine(projectFolder, relativePath),
        };

        return Array.Find(candidates, File.Exists);
    }
}
