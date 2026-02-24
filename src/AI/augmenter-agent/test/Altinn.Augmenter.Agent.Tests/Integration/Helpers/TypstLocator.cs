namespace Altinn.Augmenter.Agent.Tests.Integration.Helpers;

public static class TypstLocator
{
    public static string? FindTypst()
    {
        var pathDirs = Environment.GetEnvironmentVariable("PATH")?.Split(Path.PathSeparator) ?? [];
        foreach (var dir in pathDirs)
        {
            var candidate = Path.Combine(dir, OperatingSystem.IsWindows() ? "typst.exe" : "typst");
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        if (OperatingSystem.IsWindows())
        {
            var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var wingetPackages = Path.Combine(localAppData, "Microsoft", "WinGet", "Packages");
            if (Directory.Exists(wingetPackages))
            {
                foreach (var dir in Directory.GetDirectories(wingetPackages, "Typst.Typst*"))
                {
                    var candidates = Directory.GetFiles(dir, "typst.exe", SearchOption.AllDirectories);
                    if (candidates.Length > 0)
                    {
                        return candidates[0];
                    }
                }
            }
        }

        return null;
    }
}
