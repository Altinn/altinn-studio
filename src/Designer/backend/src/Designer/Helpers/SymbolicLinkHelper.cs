using System;
using System.IO;

namespace Altinn.Studio.Designer.Helpers;

/// <summary>
/// Keeps file access in a repository from following symbolic links. Checkouts write links as plain files (see
/// <c>LibGit2Configuration</c>), so this covers links already in a clone, such as one checked out before that.
/// </summary>
public static class SymbolicLinkHelper
{
    /// <summary>
    /// Options for enumerating a directory that neither return a symbolic link nor descend into a linked
    /// directory, and otherwise match the <see cref="SearchOption"/> overloads of <see cref="Directory"/>.
    /// </summary>
    /// <param name="searchOption">Whether to also enumerate subdirectories.</param>
    public static EnumerationOptions EnumerationOptionsSkippingLinks(
        SearchOption searchOption = SearchOption.TopDirectoryOnly
    )
    {
        return new EnumerationOptions
        {
            AttributesToSkip = FileAttributes.ReparsePoint,
            IgnoreInaccessible = false,
            MatchType = MatchType.Win32,
            RecurseSubdirectories = searchOption == SearchOption.AllDirectories,
        };
    }

    /// <summary>
    /// Determines whether the path, or any directory between the parent directory and the path, is a symbolic link.
    /// The parent directory itself is not checked.
    /// </summary>
    /// <param name="parentDirectory">Path to the directory that the path is within.</param>
    /// <param name="path">Path to a file or directory within the parent directory, or the parent directory itself.</param>
    public static bool PassesThroughLink(string parentDirectory, string path)
    {
        string fullParentDirectory = Path.TrimEndingDirectorySeparator(Path.GetFullPath(parentDirectory));
        string fullPath = Path.TrimEndingDirectorySeparator(Path.GetFullPath(path));

        if (
            fullPath != fullParentDirectory
            && !fullPath.StartsWith(fullParentDirectory + Path.DirectorySeparatorChar, StringComparison.Ordinal)
        )
        {
            throw new ArgumentException($"The path '{path}' must be within the directory '{parentDirectory}'.");
        }

        // Check from the parent directory down, so that no check resolves a path through a link it has not checked.
        int end = fullParentDirectory.Length;
        while (end < fullPath.Length)
        {
            int nextSeparator = fullPath.IndexOf(Path.DirectorySeparatorChar, end + 1);
            end = nextSeparator < 0 ? fullPath.Length : nextSeparator;
            if (new FileInfo(fullPath[..end]).LinkTarget is not null)
            {
                return true;
            }
        }

        return false;
    }
}
