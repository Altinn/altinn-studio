using System;
using System.Collections.Generic;
using System.IO;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class RepositoryDirectoryCleaner : IRepositoryDirectoryCleaner
{
    private readonly string _repositoryRoot;

    public RepositoryDirectoryCleaner(ServiceRepositorySettings repositorySettings)
    {
        _repositoryRoot = Path.GetFullPath(repositorySettings.RepositoryLocation);
    }

    public void Delete(string repositoryPath)
    {
        var repositoryDirectory = new DirectoryInfo(GetContainedPath(repositoryPath));
        if (repositoryDirectory.LinkTarget is not null)
        {
            DeleteSymbolicLink(repositoryDirectory);
            return;
        }

        if (!repositoryDirectory.Exists)
        {
            return;
        }

        DeleteDirectoryWithoutFollowingLinks(repositoryDirectory, deleteGitMetadataLast: true);
    }

    public bool TryDeleteIfEmpty(string directoryPath)
    {
        try
        {
            Directory.Delete(GetContainedPath(directoryPath), recursive: false);
            return true;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            return false;
        }
    }

    private static void DeleteDirectoryWithoutFollowingLinks(
        DirectoryInfo directory,
        bool deleteGitMetadataLast = false
    )
    {
        if (IsSymbolicLink(directory))
        {
            Directory.Delete(directory.FullName, recursive: false);
            return;
        }

        foreach (FileSystemInfo entry in EnumerateEntriesForDeletion(directory, deleteGitMetadataLast))
        {
            DeleteEntryWithoutFollowingLinks(entry);
        }

        ClearReadOnlyAttribute(directory);
        Directory.Delete(directory.FullName, recursive: false);
    }

    internal static IEnumerable<FileSystemInfo> EnumerateEntriesForDeletion(
        DirectoryInfo directory,
        bool deleteGitMetadataLast
    )
    {
        FileSystemInfo? gitMetadata = null;
        foreach (FileSystemInfo entry in directory.EnumerateFileSystemInfos())
        {
            if (deleteGitMetadataLast && string.Equals(entry.Name, ".git", StringComparison.OrdinalIgnoreCase))
            {
                gitMetadata = entry;
                continue;
            }

            yield return entry;
        }

        if (gitMetadata is not null)
        {
            yield return gitMetadata;
        }
    }

    private static bool IsSymbolicLink(FileSystemInfo entry) =>
        entry.LinkTarget is not null || entry.Attributes.HasFlag(FileAttributes.ReparsePoint);

    private static void DeleteEntryWithoutFollowingLinks(FileSystemInfo entry)
    {
        if (IsSymbolicLink(entry))
        {
            DeleteSymbolicLink(entry);
            return;
        }

        if (entry is DirectoryInfo childDirectory)
        {
            DeleteDirectoryWithoutFollowingLinks(childDirectory);
            return;
        }

        ClearReadOnlyAttribute(entry);
        File.Delete(entry.FullName);
    }

    private string GetContainedPath(string path)
    {
        string fullPath = Path.GetFullPath(path);
        string relativePath = Path.GetRelativePath(_repositoryRoot, fullPath);
        if (
            relativePath == "."
            || relativePath == ".."
            || relativePath.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal)
            || Path.IsPathRooted(relativePath)
        )
        {
            throw new ArgumentException("The cleanup path must be inside the repository root.", nameof(path));
        }

        return fullPath;
    }

    private static void ClearReadOnlyAttribute(FileSystemInfo entry)
    {
        if (entry.Attributes.HasFlag(FileAttributes.ReadOnly))
        {
            entry.Attributes &= ~FileAttributes.ReadOnly;
        }
    }

    private static void DeleteSymbolicLink(FileSystemInfo entry)
    {
        if (entry is DirectoryInfo)
        {
            try
            {
                Directory.Delete(entry.FullName, recursive: false);
            }
            catch (DirectoryNotFoundException)
            {
                File.Delete(entry.FullName);
            }
        }
        else
        {
            File.Delete(entry.FullName);
        }
    }
}
