using System.Reflection;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.TestUtils;

public class FileNamesInFolderDataAttribute(string folderName) : DataAttribute
{
    public FileNamesInFolderDataAttribute(string[] folderParts)
        : this(Path.Join(folderParts)) { }

    public override IEnumerable<object[]> GetData(MethodInfo testMethod)
    {
        var basePath = TestAttributeHelper.AltinnAppTestsBasePath();
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
}
