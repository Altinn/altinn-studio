using System.IO;
using System.Runtime.CompilerServices;

namespace Altinn.App.Benchmarks;

internal static class Fixture
{
    public static readonly DirectoryInfo ProjectFolder = GetDirectory();

    private static DirectoryInfo GetDirectory([CallerFilePath] string callerFilePath = "")
    {
        string directory = Path.GetDirectoryName(callerFilePath);
        if (directory == null)
        {
            throw new DirectoryNotFoundException($"Could not find directory for file: {callerFilePath}");
        }

        return new DirectoryInfo(directory);
    }
}
