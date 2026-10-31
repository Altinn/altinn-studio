using System;
using System.Collections.Generic;
using System.Reflection;
using System.Runtime.InteropServices;
using LibGit2Sharp;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository;

/// <summary>
/// A repository status that also writes the files' current stat data back to the index, which LibGit2Sharp's
/// <see cref="IRepository.RetrieveStatus(StatusOptions)"/> cannot do.
/// </summary>
/// <remarks>
/// Git compares each file's stat data with what the index recorded, and reads the file when they differ. On Designer's
/// SMB share the index often holds other nanoseconds than the share reports, so a status that leaves the index as it is
/// reads every file again on every call (https://github.com/Altinn/altinn-studio/issues/21656). This calls libgit2,
/// which LibGit2Sharp already loads, with <c>GIT_STATUS_OPT_UPDATE_INDEX</c>.
/// </remarks>
internal static class LibGit2Status
{
    // LibGit2Sharp's flags for a default StatusOptions, plus GIT_STATUS_OPT_UPDATE_INDEX.
    private const uint IncludeUntracked = 1 << 0;
    private const uint IncludeIgnored = 1 << 1;
    private const uint RecurseUntrackedDirs = 1 << 4;
    private const uint RenamesHeadToIndex = 1 << 7;
    private const uint RenamesFromRewrites = 1 << 11;
    private const uint UpdateIndex = 1 << 13;
    private const uint Flags =
        IncludeUntracked
        | IncludeIgnored
        | RecurseUntrackedDirs
        | RenamesHeadToIndex
        | RenamesFromRewrites
        | UpdateIndex;

    private const int GitELocked = -14;

    private static readonly Lazy<Native> s_native = new(Native.Load);

    /// <summary>
    /// Returns the same entries as <c>repo.RetrieveStatus(new StatusOptions())</c>, and saves refreshed stat data in the
    /// index. Returns null, and changes nothing, when another process holds the index's lock.
    /// </summary>
    /// <exception cref="InvalidOperationException">libgit2 fails for another reason.</exception>
    public static IReadOnlyList<(string FilePath, FileStatus State)>? RetrieveStatusUpdatingIndex(
        LibGit2Sharp.Repository repo
    )
    {
        Native native = s_native.Value;
        GitStatusOptions options = default;
        Check(native, native.OptionsInit(ref options, 1));
        options.Flags = Flags;

        SafeHandle handle = native.HandleOf(repo);
        bool addedReference = false;
        IntPtr list;
        int result;
        try
        {
            handle.DangerousAddRef(ref addedReference);
            result = native.ListNew(out list, handle.DangerousGetHandle(), ref options);
        }
        finally
        {
            if (addedReference)
            {
                handle.DangerousRelease();
            }
        }

        if (result == GitELocked)
        {
            return null;
        }
        Check(native, result);

        try
        {
            int count = checked((int)native.EntryCount(list));
            var entries = new List<(string, FileStatus)>(count);
            for (int i = 0; i < count; i++)
            {
                GitStatusEntry entry = Marshal.PtrToStructure<GitStatusEntry>(native.ByIndex(list, (UIntPtr)i));
                // As LibGit2Sharp's RepositoryStatus: the working directory's path, or else the index's.
                IntPtr delta = entry.IndexToWorkdir != IntPtr.Zero ? entry.IndexToWorkdir : entry.HeadToIndex;
                IntPtr path = Marshal.ReadIntPtr(delta, s_newFilePathOffset);
                entries.Add((Marshal.PtrToStringUTF8(path) ?? string.Empty, (FileStatus)entry.Status));
            }
            return entries;
        }
        finally
        {
            native.ListFree(list);
        }
    }

    private static readonly int s_newFilePathOffset =
        (int)Marshal.OffsetOf<GitDiffDelta>(nameof(GitDiffDelta.NewFile))
        + (int)Marshal.OffsetOf<GitDiffFile>(nameof(GitDiffFile.Path));

    private static void Check(Native native, int result)
    {
        if (result >= 0)
        {
            return;
        }
        IntPtr error = native.ErrorLast();
        string message = error == IntPtr.Zero ? string.Empty : Marshal.PtrToStringUTF8(Marshal.ReadIntPtr(error)) ?? "";
        throw new InvalidOperationException($"libgit2 failed to read the repository status ({result}): {message}");
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct GitStatusOptions
    {
        public uint Version;
        public int Show;
        public uint Flags;
        public IntPtr PathspecStrings;
        public UIntPtr PathspecCount;
        public IntPtr Baseline;
        public ushort RenameThreshold;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct GitStatusEntry
    {
        public int Status;
        public IntPtr HeadToIndex;
        public IntPtr IndexToWorkdir;
    }

    [StructLayout(LayoutKind.Sequential, Size = 20)]
    private struct GitOid { }

    [StructLayout(LayoutKind.Sequential)]
    private struct GitDiffFile
    {
        public GitOid Id;
        public IntPtr Path;
        public ulong Size;
        public uint Flags;
        public ushort Mode;
        public ushort IdAbbrev;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct GitDiffDelta
    {
        public int Status;
        public uint Flags;
        public ushort Similarity;
        public ushort FileCount;
        public GitDiffFile OldFile;
        public GitDiffFile NewFile;
    }

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate int StatusOptionsInit(ref GitStatusOptions options, uint version);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate int StatusListNew(out IntPtr list, IntPtr repository, ref GitStatusOptions options);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate UIntPtr StatusListEntryCount(IntPtr list);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate IntPtr StatusByIndex(IntPtr list, UIntPtr index);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate void StatusListFree(IntPtr list);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate IntPtr ErrorLast();

    /// <summary>
    /// The libgit2 functions, from the library LibGit2Sharp loads, and LibGit2Sharp's handle to a repository. Both are
    /// internal to LibGit2Sharp, so a LibGit2Sharp upgrade can break them; this class's tests then fail.
    /// </summary>
    private sealed class Native
    {
        public required StatusOptionsInit OptionsInit { get; init; }
        public required StatusListNew ListNew { get; init; }
        public required StatusListEntryCount EntryCount { get; init; }
        public required StatusByIndex ByIndex { get; init; }
        public required StatusListFree ListFree { get; init; }
        public required ErrorLast ErrorLast { get; init; }
        public required Func<LibGit2Sharp.Repository, SafeHandle> HandleOf { get; init; }

        public static Native Load()
        {
            Assembly libGit2Sharp = typeof(LibGit2Sharp.Repository).Assembly;
            string libraryName =
                libGit2Sharp.GetType("LibGit2Sharp.Core.NativeDllName")?.GetField("Name")?.GetRawConstantValue()
                    as string
                ?? throw new InvalidOperationException("LibGit2Sharp no longer names its libgit2 library.");
            PropertyInfo handleProperty =
                typeof(LibGit2Sharp.Repository).GetProperty("Handle", BindingFlags.NonPublic | BindingFlags.Instance)
                ?? throw new InvalidOperationException("LibGit2Sharp's repository no longer has a handle.");
            IntPtr library = NativeLibrary.Load(libraryName, libGit2Sharp, null);

            return new Native
            {
                OptionsInit = Export<StatusOptionsInit>(library, "git_status_options_init"),
                ListNew = Export<StatusListNew>(library, "git_status_list_new"),
                EntryCount = Export<StatusListEntryCount>(library, "git_status_list_entrycount"),
                ByIndex = Export<StatusByIndex>(library, "git_status_byindex"),
                ListFree = Export<StatusListFree>(library, "git_status_list_free"),
                ErrorLast = Export<ErrorLast>(library, "git_error_last"),
                HandleOf = repo =>
                    handleProperty.GetValue(repo) as SafeHandle
                    ?? throw new InvalidOperationException("LibGit2Sharp's repository handle is not a SafeHandle."),
            };
        }

        private static T Export<T>(IntPtr library, string name)
            where T : Delegate => Marshal.GetDelegateForFunctionPointer<T>(NativeLibrary.GetExport(library, name));
    }
}
