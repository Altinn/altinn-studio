using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;

namespace Altinn.Studio.Designer.Helpers;

public static class AltinnStudioRepositoryScanner
{
    public static string FindDotEnvFilePath()
    {
        return Path.Join(FindRootDirectoryPath(), "src", "Designer", ".env");
    }

    public static string FindKafkaComposerFilePath()
    {
        return Path.Join(FindRootDirectoryPath(), "src", "Designer", "development", "kafka", "compose.yaml");
    }

    public static string FindRootDirectoryPath([CallerFilePath] string filePath = "")
    {
        return GetDirectoryPathBySearchPattern(Path.GetDirectoryName(filePath), ".github");
    }

    private static string GetDirectoryPathBySearchPattern(string path, string searchPattern)
    {
        return GetDirectoryPathBySearchPattern(Directory.Exists(path) ? new DirectoryInfo(path) : null, searchPattern);
    }

    private static string GetDirectoryPathBySearchPattern(DirectoryInfo path, string searchPattern)
    {
        if (path != null)
        {
            return path.EnumerateFileSystemInfos(searchPattern, SearchOption.TopDirectoryOnly).Any() ? path.FullName : GetDirectoryPathBySearchPattern(path.Parent, searchPattern);
        }

        string message = $"Cannot find '{searchPattern}' and resolve the base directory in the directory tree.";
        throw new DirectoryNotFoundException(message);
    }
}
