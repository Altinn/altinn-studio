using System.Runtime.CompilerServices;

namespace Altinn.App.Core.Tests.TestUtils;

public class PathUtils
{
    public static string GetCoreTestsPath()
    {
        // This method is used to get the path to the test folder for the Altinn.App.Core project.
        // We need a private method to avoid the [CallerFilePath] attribute from being used in the public method.
        // This is because the [CallerFilePath] attribute will return the path to the file where the method is called from,
        // not the path to the file where the method is defined.
        return GetCoreTestsPathInternal();
    }

    private static string GetCoreTestsPathInternal([CallerFilePath] string? filePath = null)
    {
        return Path.GetDirectoryName(Path.GetDirectoryName(filePath))
            ?? throw new DirectoryNotFoundException(
                $"Could not find directory for file {filePath}. Please check the test data root directory."
            );
    }
}
