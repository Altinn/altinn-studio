namespace Altinn.Augmenter.Agent.Tests.Integration.Helpers;

public static class ClaudeCliLocator
{
    public static string? FindClaude()
    {
        var pathDirs = Environment.GetEnvironmentVariable("PATH")?.Split(Path.PathSeparator) ?? [];
        foreach (var dir in pathDirs)
        {
            var candidate = Path.Combine(dir, OperatingSystem.IsWindows() ? "claude.exe" : "claude");
            if (File.Exists(candidate))
                return candidate;
        }

        // Common install locations
        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        string[] commonPaths =
        [
            Path.Combine(home, ".local", "bin", "claude"),
            Path.Combine(home, ".local", "bin", "claude.exe"),
            Path.Combine(home, ".npm-global", "bin", "claude"),
        ];

        foreach (var path in commonPaths)
        {
            if (File.Exists(path))
                return path;
        }

        return null;
    }
}
