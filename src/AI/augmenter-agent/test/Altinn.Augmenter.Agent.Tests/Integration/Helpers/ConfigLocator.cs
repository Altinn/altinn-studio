namespace Altinn.Augmenter.Agent.Tests.Integration.Helpers;

/// <summary>
/// Locates the repository-local config/ folder that holds skills and templates.
/// Tests run from bin/Debug/net10.0/; the folder is several levels up at the project root.
/// </summary>
public static class ConfigLocator
{
    private const int MaxSearchDepth = 8;

    public static string GetConfigRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        for (var i = 0; i < MaxSearchDepth && dir != null; i++, dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, "config");
            if (Directory.Exists(Path.Combine(candidate, "skills")) &&
                Directory.Exists(Path.Combine(candidate, "templates")))
            {
                return candidate;
            }
        }
        throw new DirectoryNotFoundException(
            $"Could not locate config/ folder upwards from {AppContext.BaseDirectory}.");
    }

    public static string GetTemplatesRoot() => Path.Combine(GetConfigRoot(), "templates");
    public static string GetSkillsRoot() => Path.Combine(GetConfigRoot(), "skills");
}
