using Microsoft.Win32.SafeHandles;

namespace Altinn.Studio.Preview.Files;

/// <summary>
/// Read-only access to the files of one working copy, and the only code in the service that opens files, which the
/// build enforces (<c>BannedSymbols.txt</c>). A path can't leave the working copy, reach Git's metadata or pass through
/// a symbolic link, so a session reads its own app and nothing else. The volume is also mounted read-only, so nothing
/// here could write to it.
/// </summary>
/// <remarks>
/// <para>
/// The folder holds its working copy's directory open, and opens every path from it with
/// <see cref="LinuxFiles.OpenBeneath"/>, so the kernel enforces both rules about links and leaving the folder. A
/// directory that changes into a link while preview reads it can't redirect a read.
/// </para>
/// <para>
/// Designer checks out links as plain files, so a push can't put a link in a working copy. The link rules cover links
/// already there, such as from a clone made before Designer did that.
/// </para>
/// </remarks>
internal sealed class AppFolder : IDisposable
{
    private readonly SafeFileHandle _directory;

    private AppFolder(SafeFileHandle directory)
    {
        _directory = directory;
    }

    /// <summary>Whether <paramref name="repositoryRoot"/> is a directory the service can open.</summary>
    public static bool CanOpenRepositoryRoot(string repositoryRoot)
    {
        using SafeFileHandle? root = LinuxFiles.OpenTrustedDirectory(repositoryRoot);
        return root is not null;
    }

    /// <summary>
    /// Opens the working copy's folder, or returns <c>null</c> when it doesn't exist or is reached through a link.
    /// </summary>
    public static AppFolder? Open(string repositoryRoot, WorkingCopy workingCopy)
    {
        using SafeFileHandle? root = LinuxFiles.OpenTrustedDirectory(repositoryRoot);
        if (root is null)
        {
            return null;
        }

#pragma warning disable CA2000 // The folder owns the directory, and closes it when it is disposed.
        SafeFileHandle? directory = LinuxFiles.OpenBeneath(
            root,
            $"{workingCopy.Developer}/{workingCopy.Org}/{workingCopy.App}",
            FileKind.Directory
        );
#pragma warning restore CA2000
        return directory is null ? null : new AppFolder(directory);
    }

    /// <summary>
    /// Opens a file for reading, or returns <c>null</c> when there is no such file, the service may not read it, or
    /// the path is one this folder doesn't serve.
    /// </summary>
    /// <param name="relativePath">The file's path in the working copy, with <c>/</c> between the segments.</param>
    public Stream? OpenRead(string relativePath)
    {
#pragma warning disable CA2000 // The stream owns the file, and closes it when it is disposed.
        SafeFileHandle? file = IsPlainPath(relativePath)
            ? LinuxFiles.OpenBeneath(_directory, relativePath, FileKind.File)
            : null;
#pragma warning restore CA2000

        // The one place a file becomes a stream; see BannedSymbols.txt.
#pragma warning disable RS0030
        return file is null ? null : new FileStream(file, FileAccess.Read);
#pragma warning restore RS0030
    }

    /// <summary>Whether the working copy has a file at <paramref name="relativePath"/>.</summary>
    public bool FileExists(string relativePath)
    {
        if (!IsPlainPath(relativePath))
        {
            return false;
        }

        using SafeFileHandle? file = LinuxFiles.OpenBeneath(_directory, relativePath, FileKind.File);
        return file is not null;
    }

    /// <summary>
    /// The names of the files in a directory of the working copy, in ordinal order. Leaves out links and Git's
    /// metadata, and is empty when there is no such directory.
    /// </summary>
    /// <param name="relativeDirectory">The directory's path, or an empty string for the working copy itself.</param>
    public IReadOnlyList<string> ListFiles(string relativeDirectory) => List(relativeDirectory, FileKind.File);

    /// <summary>
    /// The names of the directories in a directory of the working copy, in ordinal order. Leaves out links and Git's
    /// metadata, and is empty when there is no such directory.
    /// </summary>
    /// <param name="relativeDirectory">The directory's path, or an empty string for the working copy itself.</param>
    public IReadOnlyList<string> ListDirectories(string relativeDirectory) =>
        List(relativeDirectory, FileKind.Directory);

    public void Dispose() => _directory.Dispose();

    private List<string> List(string relativeDirectory, FileKind kind)
    {
        if (relativeDirectory.Length == 0)
        {
            return ListEntries(_directory, kind);
        }

        if (!IsPlainPath(relativeDirectory))
        {
            return [];
        }

        using SafeFileHandle? directory = LinuxFiles.OpenBeneath(_directory, relativeDirectory, FileKind.Directory);
        return directory is null ? [] : ListEntries(directory, kind);
    }

    /// <summary>
    /// Lists an open directory. .NET lists directories by path only, so this lists the path the kernel gives the open
    /// directory, which is the directory itself even if its path has changed since it was opened.
    /// </summary>
    private static List<string> ListEntries(SafeFileHandle directory, FileKind kind)
    {
        var names = new List<string>();
        // The caller holds the directory open while it is listed, so its descriptor can't be reused for another file.
#pragma warning disable S3869
        string openDirectory = $"/proc/self/fd/{directory.DangerousGetHandle()}";
#pragma warning restore S3869
        // The open directory itself; see BannedSymbols.txt.
#pragma warning disable RS0030
        IEnumerable<string> entries = Directory.EnumerateFileSystemEntries(openDirectory);
#pragma warning restore RS0030
        foreach (string entry in entries)
        {
            string name = Path.GetFileName(entry);
            if (!IsGitMetadata(name) && LinuxFiles.KindOf(directory, name) == kind)
            {
                names.Add(name);
            }
        }

        names.Sort(StringComparer.Ordinal);
        return names;
    }

    /// <summary>
    /// Whether every segment of the path is a plain name. The kernel would refuse <c>..</c> that leaves the working
    /// copy anyway; this also refuses Git's metadata and paths that only work through <c>.</c> or <c>..</c>.
    /// </summary>
    private static bool IsPlainPath(string relativePath)
    {
        foreach (string segment in relativePath.Split('/'))
        {
            if (!IsPlainSegment(segment))
            {
                return false;
            }
        }

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
}
