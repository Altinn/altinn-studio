using System.Reflection;
using System.Text.Json;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.TestUtils;

public class FileNamesInFolderDataAttribute(string folderName) : DataAttribute
{
    public FileNamesInFolderDataAttribute(string[] folderParts)
        : this(Path.Join(folderParts)) { }

    public override IEnumerable<object[]> GetData(MethodInfo testMethod)
    {
        var basePath = TestAttributeHelper.AltinnAppTestsBasePath();
        var folder = Path.IsPathRooted(folderName) ? folderName : Path.Join(basePath, folderName);
        if (!Directory.Exists(folder))
        {
            throw new DirectoryNotFoundException($"Folder not found: {folder}");
        }
        return Directory
            .GetFiles(folder)
            .Where(fullPath => !IsDisabledInBackend(fullPath))
            .Select(fullPath =>
                new object[]
                {
                    Path.GetFileName(fullPath),
                    Path.GetDirectoryName(fullPath) ?? throw new Exception($"Folder not found for {fullPath}"),
                }
            );
    }

    private static bool IsDisabledInBackend(string fullPath)
    {
        if (Path.GetExtension(fullPath) != ".json")
        {
            return false;
        }

        using var document = JsonDocument.Parse(File.ReadAllText(fullPath));
        return document.RootElement.TryGetProperty("disabledBackend", out var disabled) && disabled.GetBoolean();
    }
}
