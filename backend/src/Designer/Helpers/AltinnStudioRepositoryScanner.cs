using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;

namespace Altinn.Studio.Designer.Helpers;

public static class AltinnStudioRepositoryScanner
{
    public  static string FindRootDotEnvFilePath()
    {
        return Path.Combine(FindRootDirectoryPath(), ".env");
    }

    public static string FindRootDirectoryPath([CallerFilePath] string filePath = "")
    {
        return GetDirectoryPath(Path.GetDirectoryName(filePath), ".github");
    }

    private static string GetDirectoryPath(string path, string searchPattern)
    {
        return GetDirectoryPath(Directory.Exists(path) ? new DirectoryInfo(path) : null, searchPattern);
    }

    private static string GetDirectoryPath(DirectoryInfo path, string searchPattern)
    {
        if (path != null)
        {
            return path.EnumerateFileSystemInfos(searchPattern, SearchOption.TopDirectoryOnly).Any() ? path.FullName : GetDirectoryPath(path.Parent, searchPattern);
        }

        string message = $"Cannot find '{searchPattern}' and resolve the base directory in the directory tree.";
        throw new DirectoryNotFoundException(message);
    }
}
