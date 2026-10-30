using System;
using System.Collections.Generic;
using System.IO;

namespace Altinn.Studio.Designer.Helpers;

/// <summary>
/// Validates working-tree paths. Git metadata is reserved for the source-control service, not editor APIs.
/// </summary>
internal static class RepositoryFileAccess
{
    internal static string Validate(string repositoryDirectory, string path)
    {
        string root = Path.TrimEndingDirectorySeparator(Path.GetFullPath(repositoryDirectory));
        string fullPath = Path.GetFullPath(path);
        string relativePath = Path.GetRelativePath(root, fullPath);
        if (
            Path.IsPathRooted(relativePath)
            || relativePath == ".."
            || relativePath.StartsWith(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal)
        )
        {
            throw new ArgumentException("The path must be inside the repository.", nameof(path));
        }

        foreach (string segment in relativePath.Replace('\\', '/').Split('/'))
        {
            if (IsGitMetadata(segment))
            {
                throw new ArgumentException("Git metadata is not accessible through file APIs.", nameof(path));
            }
        }

        if (new DirectoryInfo(root).LinkTarget is not null || SymbolicLinkHelper.PassesThroughLink(root, fullPath))
        {
            throw new ArgumentException("Repository file access must not follow symbolic links.", nameof(path));
        }

        return fullPath;
    }

    internal static bool IsGitMetadata(string name)
    {
        // Also reject case variants, trailing dots/spaces and NTFS stream/short-name aliases on Windows.
        string normalized = name.Split(':')[0].TrimEnd(' ', '.');
        return normalized.Equals(".git", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("git~1", StringComparison.OrdinalIgnoreCase);
    }

    internal static IEnumerable<string> GetDirectories(
        string repositoryDirectory,
        string directory,
        FileAttributes attributesToSkip = 0
    )
    {
        directory = Validate(repositoryDirectory, directory);
        var options = SymbolicLinkHelper.EnumerationOptionsSkippingLinks();
        options.AttributesToSkip |= attributesToSkip;
        foreach (string child in Directory.EnumerateDirectories(directory, "*", options))
        {
            if (!IsGitMetadata(Path.GetFileName(child)))
            {
                yield return Validate(repositoryDirectory, child);
            }
        }
    }

    internal static IEnumerable<string> GetFiles(
        string repositoryDirectory,
        string directory,
        string pattern = "*",
        bool recursive = false,
        MatchCasing matchCasing = MatchCasing.PlatformDefault,
        FileAttributes attributesToSkip = 0
    )
    {
        directory = Validate(repositoryDirectory, directory);
        var options = SymbolicLinkHelper.EnumerationOptionsSkippingLinks();
        options.MatchCasing = matchCasing;
        options.AttributesToSkip |= attributesToSkip;
        foreach (string file in Directory.EnumerateFiles(directory, pattern, options))
        {
            if (!IsGitMetadata(Path.GetFileName(file)))
            {
                yield return Validate(repositoryDirectory, file);
            }
        }

        if (recursive)
        {
            foreach (string child in GetDirectories(repositoryDirectory, directory, attributesToSkip))
            {
                foreach (
                    string file in GetFiles(repositoryDirectory, child, pattern, true, matchCasing, attributesToSkip)
                )
                {
                    yield return file;
                }
            }
        }
    }
}
