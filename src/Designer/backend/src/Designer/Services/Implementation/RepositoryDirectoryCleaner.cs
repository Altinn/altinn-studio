using System;
using System.Collections.Generic;
using System.IO;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class RepositoryDirectoryCleaner : IRepositoryDirectoryCleaner
{
    public void Delete(string repositoryPath)
    {
        var repositoryDirectory = new DirectoryInfo(repositoryPath);
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
            Directory.Delete(directoryPath, recursive: false);
            return true;
        }
        catch (DirectoryNotFoundException)
        {
            return false;
        }
        catch (IOException)
        {
            return false;
        }
        catch (UnauthorizedAccessException)
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

        File.SetAttributes(directory.FullName, FileAttributes.Normal);
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

        File.SetAttributes(entry.FullName, FileAttributes.Normal);
        File.Delete(entry.FullName);
    }

    private static void DeleteSymbolicLink(FileSystemInfo entry)
    {
        if (entry is DirectoryInfo)
        {
            Directory.Delete(entry.FullName, recursive: false);
        }
        else
        {
            File.Delete(entry.FullName);
        }
    }
}
