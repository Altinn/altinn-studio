using System.Runtime.CompilerServices;

namespace Altinn.App.Tests.Common.Data;

public static class CommonTestData
{
    public static string GetRegisterProfilePath()
    {
        string testDataDirectory = GetTestDataRootDirectory();
        return Path.Join(testDataDirectory, "Profile", "User");
    }

    public static string GetAltinnProfilePath()
    {
        string testDataDirectory = GetTestDataRootDirectory();
        return Path.Join(testDataDirectory, "Register", "Party");
    }

    private static string GetTestDataRootDirectory()
    {
        var file = GetCallerFilePath();
        return (
                Path.GetDirectoryName(file)
                ?? throw new DirectoryNotFoundException(
                    $"Could not find directory for file {file}. Please check the test data root directory."
                )
            ) + '/';
    }

    private static string GetCallerFilePath([CallerFilePath] string file = "") => file;
}
