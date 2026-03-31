using System.Runtime.CompilerServices;

namespace Altinn.App.Core.Tests.TestUtils;

public static class TestAttributeHelper
{
    public static string AltinnAppTestsBasePath([CallerFilePath] string? callerFilePath = null)
    {
        if (callerFilePath is null)
        {
            throw new InvalidOperationException("CallerFilePath attribute returned null");
        }
        var testUtilsDirectoryPath = Path.GetDirectoryName(callerFilePath);
        if (testUtilsDirectoryPath is null)
        {
            throw new InvalidOperationException($"Could not get directory name from caller path: {callerFilePath}");
        }
        var callerDirectoryPath = Path.GetDirectoryName(testUtilsDirectoryPath);
        if (callerDirectoryPath is null)
        {
            throw new InvalidOperationException($"Could not get parent directory from: {testUtilsDirectoryPath}");
        }

        return callerDirectoryPath;
    }
}
