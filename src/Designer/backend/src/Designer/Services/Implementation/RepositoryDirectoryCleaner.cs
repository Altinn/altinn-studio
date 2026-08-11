using System;
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

        DeleteDirectoryWithoutFollowingLinks(repositoryDirectory);
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

    private static void DeleteDirectoryWithoutFollowingLinks(DirectoryInfo directory)
    {
        if (IsSymbolicLink(directory))
        {
            Directory.Delete(directory.FullName, recursive: false);
            return;
        }

        foreach (FileSystemInfo entry in directory.EnumerateFileSystemInfos())
        {
            if (IsSymbolicLink(entry))
            {
                DeleteSymbolicLink(entry);
                continue;
            }

            if (entry is DirectoryInfo childDirectory)
            {
                DeleteDirectoryWithoutFollowingLinks(childDirectory);
                continue;
            }

            File.SetAttributes(entry.FullName, FileAttributes.Normal);
            File.Delete(entry.FullName);
        }

        File.SetAttributes(directory.FullName, FileAttributes.Normal);
        Directory.Delete(directory.FullName, recursive: false);
    }

    private static bool IsSymbolicLink(FileSystemInfo entry) =>
        entry.LinkTarget is not null || entry.Attributes.HasFlag(FileAttributes.ReparsePoint);

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
