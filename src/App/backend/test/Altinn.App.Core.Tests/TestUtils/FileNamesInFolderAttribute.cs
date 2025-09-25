using System.Reflection;
using System.Runtime.CompilerServices;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.TestUtils;

public class FileNamesInFolderDataAttribute(string folderName) : DataAttribute
{
    public FileNamesInFolderDataAttribute(string[] folderParts)
        : this(Path.Join(folderParts)) { }

    public override IEnumerable<object[]> GetData(MethodInfo testMethod)
    {
        var basePath = AltinnAppTestsBasePath();
        var folder = Path.Join(basePath, folderName);
        if (!Directory.Exists(folder))
        {
            throw new DirectoryNotFoundException($"Folder not found: {folder}");
        }
        return Directory
            .GetFiles(folder)
            .Select(fullPath =>
                new object[]
                {
                    Path.GetFileName(fullPath),
                    Path.GetDirectoryName(fullPath) ?? throw new Exception($"Folder not found for {fullPath}"),
                }
            );
    }

    private static string AltinnAppTestsBasePath([CallerFilePath] string? callerFilePath = null)
    {
        if (callerFilePath is null)
        {
            throw new Exception("Caller path is null");
        }
        var testUtilsDirectoryPath = Path.GetDirectoryName(callerFilePath);
        if (testUtilsDirectoryPath is null)
        {
            throw new Exception("Caller path is null");
        }
        var callerDirectoryPath = Path.GetDirectoryName(testUtilsDirectoryPath);
        if (callerDirectoryPath is null)
        {
            throw new Exception("Caller path is null");
        }

        return callerDirectoryPath;
    }
}
