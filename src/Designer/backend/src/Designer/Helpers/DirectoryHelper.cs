#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.FileSystemGlobbing;

namespace Altinn.Studio.Designer.Helpers;

/// <summary>
/// Helper class for directories
/// </summary>
public static class DirectoryHelper
{
    /// <summary>
    /// Deleted all files and subdirectories before deleting the directory.
    /// </summary>
    /// <param name="directoryToDelete">Full path to the directory.</param>
    public static void DeleteFilesAndDirectory(string directoryToDelete)
    {
        DirectoryInfo directoryToDeleteInfo = new DirectoryInfo(directoryToDelete);

        if (directoryToDeleteInfo.LinkTarget is not null)
        {
            Directory.Delete(directoryToDeleteInfo.FullName);
            return;
        }

        if (!directoryToDeleteInfo.Exists)
        {
            return;
        }

        DirectoryInfo[] subDirectories = directoryToDeleteInfo.GetDirectories();

        FileInfo[] files = directoryToDeleteInfo.GetFiles();
        foreach (FileInfo file in files)
        {
            if (file.LinkTarget is null)
            {
                File.SetAttributes(file.FullName, FileAttributes.Normal);
            }
            File.Delete(file.FullName);
        }

        foreach (DirectoryInfo directory in subDirectories)
        {
            DeleteFilesAndDirectory(directory.FullName);
        }

        File.SetAttributes(directoryToDeleteInfo.FullName, FileAttributes.Normal);
        Directory.Delete(directoryToDeleteInfo.FullName);
    }

    public static IEnumerable<string> ResolveFilesFromPattern(string baseDirectory, string pattern)
    {
        var matcher = new Matcher(StringComparison.OrdinalIgnoreCase);
        matcher.AddInclude(pattern);

        var files = RepositoryFileAccess.GetFiles(baseDirectory, baseDirectory, recursive: true);
        var result = matcher.Match(files.Select(file => Path.GetRelativePath(baseDirectory, file)));

        return result.Files.Select(f => Path.Combine(baseDirectory, f.Path));
    }

    public static async Task CopyDirectoryAsync(string sourceDir, string targetDir)
    {
        await CopyDirectory(sourceDir, targetDir, sourceDir, targetDir);
    }

    private static async Task CopyDirectory(string sourceRoot, string targetRoot, string sourceDir, string targetDir)
    {
        DirectoryInfo target = new(RepositoryFileAccess.Validate(targetRoot, targetDir));
        if (!target.Exists)
        {
            target.Create();
        }

        foreach (string file in RepositoryFileAccess.GetFiles(sourceRoot, sourceDir))
        {
            string targetPath = RepositoryFileAccess.Validate(
                targetRoot,
                Path.Combine(target.FullName, Path.GetFileName(file))
            );
            await using FileStream sourceStream = File.OpenRead(file);
            await using FileStream targetStream = File.Create(targetPath);
            await sourceStream.CopyToAsync(targetStream);
        }

        foreach (string subDir in RepositoryFileAccess.GetDirectories(sourceRoot, sourceDir))
        {
            string nextTarget = RepositoryFileAccess.Validate(
                targetRoot,
                Path.Combine(target.FullName, Path.GetFileName(subDir))
            );
            await CopyDirectory(sourceRoot, targetRoot, subDir, nextTarget);
        }
    }
}
