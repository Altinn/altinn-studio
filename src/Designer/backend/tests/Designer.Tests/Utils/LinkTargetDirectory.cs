using System;
using System.IO;

namespace Designer.Tests.Utils;

/// <summary>
/// A temporary directory holding one file, for tests that create symbolic links to the file or the directory.
/// </summary>
public sealed class LinkTargetDirectory : IDisposable
{
    public LinkTargetDirectory(string fileName, string fileContent)
    {
        DirectoryPath = Directory.CreateTempSubdirectory("designer-link-target-").FullName;
        FilePath = Path.Join(DirectoryPath, fileName);
        FileContent = fileContent;
        File.WriteAllText(FilePath, fileContent);
    }

    public string DirectoryPath { get; }

    public string FilePath { get; }

    public string FileContent { get; }

    public void LinkFileFrom(string linkPath)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(linkPath));
        File.CreateSymbolicLink(linkPath, FilePath);
    }

    public void LinkDirectoryFrom(string linkPath)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(linkPath));
        Directory.CreateSymbolicLink(linkPath, DirectoryPath);
    }

    public void Dispose()
    {
        Directory.Delete(DirectoryPath, recursive: true);
    }
}
