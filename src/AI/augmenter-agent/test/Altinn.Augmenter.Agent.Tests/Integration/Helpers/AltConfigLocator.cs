namespace Altinn.Augmenter.Agent.Tests.Integration.Helpers;

/// <summary>
/// Locates the repository-local examples/alt-config/ folder. Mirrors
/// <see cref="ConfigLocator"/>'s "templates + registries" pair heuristic but
/// against the alt-config tree, since that folder is what AltConfigSwapTests
/// mounts in place of config/ to exercise the multi-tenant promise.
/// </summary>
public static class AltConfigLocator
{
    private const int MaxSearchDepth = 8;

    public static string GetConfigRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        for (var i = 0; i < MaxSearchDepth && dir != null; i++, dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, "examples", "alt-config");
            if (Directory.Exists(Path.Combine(candidate, "templates")) &&
                Directory.Exists(Path.Combine(candidate, "registries")))
            {
                return candidate;
            }
        }
        throw new DirectoryNotFoundException(
            $"Could not locate examples/alt-config/ from {AppContext.BaseDirectory}.");
    }

    public static string GetSampleApplicationPath()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        for (var i = 0; i < MaxSearchDepth && dir != null; i++, dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, "examples", "applications", "permisjonssoknad-eksempel.json");
            if (File.Exists(candidate))
                return candidate;
        }
        throw new FileNotFoundException(
            "permisjonssoknad-eksempel.json not found upwards from " + AppContext.BaseDirectory);
    }
}
