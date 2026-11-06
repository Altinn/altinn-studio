namespace Altinn.Studio.Preview.Files;

/// <summary>
/// Read-only access to the files of one working copy. A path can't leave the working copy, reach Git's metadata or
/// pass through a symbolic link, so a session reads its own app and nothing else. The volume is also mounted
/// read-only, so nothing here could write to it.
/// </summary>
/// <remarks>
/// Designer checks out links as plain files, so a push can't put a link in a working copy. The link checks cover
/// links already there, such as from a clone made before Designer did that.
/// </remarks>
internal sealed class AppFolder
{
    private readonly string _repositoryRoot;
    private readonly string _directory;

    private AppFolder(string repositoryRoot, string directory)
    {
        _repositoryRoot = repositoryRoot;
        _directory = directory;
    }

    /// <summary>
    /// The working copy's folder, or <c>null</c> when it doesn't exist or is reached through a link.
    /// </summary>
    public static AppFolder? Find(string repositoryRoot, WorkingCopy workingCopy)
    {
        string root = Path.TrimEndingDirectorySeparator(Path.GetFullPath(repositoryRoot));
        string directory = Path.Combine(root, workingCopy.Developer, workingCopy.Org, workingCopy.App);
        return Directory.Exists(directory) && !PassesThroughLink(root, directory)
            ? new AppFolder(root, directory)
            : null;
    }

    /// <summary>
    /// Opens a file for reading, or returns <c>null</c> when there is no such file, the service may not read it, or
    /// the path is one this folder doesn't serve.
    /// </summary>
    /// <param name="relativePath">The file's path in the working copy, with <c>/</c> between the segments.</param>
    public FileStream? OpenRead(string relativePath)
    {
        if (!TryResolve(relativePath, out string? fullPath) || !File.Exists(fullPath))
        {
            return null;
        }

        try
        {
            return new FileStream(
                fullPath,
                new FileStreamOptions
                {
                    Mode = FileMode.Open,
                    Access = FileAccess.Read,
                    // Designer writes to the working copy while preview reads it.
                    Share = FileShare.ReadWrite | FileShare.Delete,
                    Options = FileOptions.Asynchronous,
                }
            );
        }
        // Designer can delete the file after the check above.
        catch (Exception exception)
            when (exception is FileNotFoundException or DirectoryNotFoundException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    private bool TryResolve(
        string relativePath,
        [System.Diagnostics.CodeAnalysis.NotNullWhen(true)] out string? fullPath
    )
    {
        fullPath = null;
        foreach (string segment in relativePath.Split('/'))
        {
            if (!IsPlainSegment(segment))
            {
                return false;
            }
        }

        string candidate = Path.GetFullPath(Path.Combine(_directory, relativePath));
        if (
            !candidate.StartsWith(_directory + Path.DirectorySeparatorChar, StringComparison.Ordinal)
            || PassesThroughLink(_repositoryRoot, candidate)
        )
        {
            return false;
        }

        fullPath = candidate;
        return true;
    }

    private static bool IsPlainSegment(string segment) =>
        segment.Length > 0
        && segment is not ("." or "..")
        && segment.IndexOfAny(['\\', '\0']) < 0
        && !IsGitMetadata(segment);

    /// <summary>
    /// The same rule as Designer's <c>RepositoryFileAccess</c>: <c>.git</c> in any case, with trailing dots or spaces,
    /// or as Windows' short name or a stream of it.
    /// </summary>
    private static bool IsGitMetadata(string segment)
    {
        string name = segment.Split(':')[0].TrimEnd(' ', '.');
        return name.Equals(".git", StringComparison.OrdinalIgnoreCase)
            || name.Equals("git~1", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Whether any directory or file from below <paramref name="root"/> down to <paramref name="path"/> is a link.
    /// Checked from the top down, so that no check resolves a path through a link that hasn't been checked.
    /// </summary>
    private static bool PassesThroughLink(string root, string path)
    {
        int end = root.Length;
        while (end < path.Length)
        {
            int nextSeparator = path.IndexOf(Path.DirectorySeparatorChar, end + 1);
            end = nextSeparator < 0 ? path.Length : nextSeparator;
            if (new FileInfo(path[..end]).LinkTarget is not null)
            {
                return true;
            }
        }

        return false;
    }
}
