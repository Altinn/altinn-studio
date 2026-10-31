using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using LibGit2Sharp;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository;

/// <summary>
/// A repository status that also writes the files' current stat data back to the index, which LibGit2Sharp's
/// <see cref="IRepository.RetrieveStatus(StatusOptions)"/> cannot do.
/// </summary>
/// <remarks>
/// Git compares each file's stat data with what the index recorded, and reads the file when they differ. On Designer's
/// SMB share the index often holds other nanoseconds than the share reports, so a status that leaves the index as it is
/// reads every file again on every call (https://github.com/Altinn/altinn-studio/issues/21656). This calls libgit2 with
/// <c>GIT_STATUS_OPT_UPDATE_INDEX</c>, through function pointers into the library that LibGit2Sharp has loaded, so both
/// use one copy of libgit2 and its global state.
/// </remarks>
internal static unsafe class LibGit2Status
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

    // The libgit2 build that the struct layouts below were checked against: libgit2 1.8.6, in LibGit2Sharp 0.32, which
    // reports it as GlobalSettings.Version.LibGit2CommitSha and loads it as the library git2-<that commit>. Wrong layouts
    // read and write the wrong memory rather than fail, so before you set this to a new build, compare the new libgit2's
    // headers and LibGit2Sharp's source with this file:
    // - The structs match git_status_options and git_status_entry in include/git2/status.h, git_diff_delta and
    //   git_diff_file in diff.h, git_oid in oid.h and git_error in errors.h, field by field. git_oid grows in builds
    //   with SHA-256 support.
    // - The flag values match GIT_STATUS_OPT_* in status.h, and Flags matches what LibGit2Sharp's RepositoryStatus.cs
    //   passes for a default StatusOptions.
    // - The function pointer types match the functions they load.
    // - LibGit2Sharp's Repository still has the internal Handle property, a LibGit2Sharp.Core.Handles.RepositoryHandle.
    // Then run SourceControlServiceTest, whose parity test compares this status with LibGit2Sharp's.
    private const string SupportedLibGit2 = "5853918";

    private static readonly Lazy<(Native? Native, string? Failure)> s_native = new(Native.Load);

    /// <summary>
    /// Returns the same entries as <c>repo.RetrieveStatus(new StatusOptions())</c>, and saves refreshed stat data in the
    /// index. Returns null, with the reason in <paramref name="failure"/>, when it can't: when libgit2 fails, for
    /// example because another process holds the index's lock, or when LibGit2Sharp loads another libgit2 than the one
    /// this was checked against. The caller then reads the status without saving it, as <c>git status</c> does when it
    /// can't write the index.
    /// </summary>
    public static IReadOnlyList<(string FilePath, FileStatus State)>? RetrieveStatusUpdatingIndex(
        LibGit2Sharp.Repository repo,
        out string? failure
    )
    {
        (Native? native, failure) = s_native.Value;
        if (native is null)
        {
            return null;
        }

        SafeHandle? handle;
        try
        {
            handle = GetHandle(repo) as SafeHandle;
        }
        catch (Exception e) when (e is MissingMemberException or TypeLoadException)
        {
            handle = null;
        }
        if (handle is null)
        {
            failure = "LibGit2Sharp's repository no longer has a RepositoryHandle.";
            return null;
        }

        GitStatusOptions options = default;
        int result = native.OptionsInit(&options, GitStatusOptions.Version1);
        nint list = 0;
        if (result >= 0)
        {
            options.Flags = Flags;
            bool addedReference = false;
            try
            {
                handle.DangerousAddRef(ref addedReference);
                result = native.ListNew(&list, handle.DangerousGetHandle(), &options);
            }
            finally
            {
                if (addedReference)
                {
                    handle.DangerousRelease();
                }
            }
        }

        if (result < 0)
        {
            GitError* error = native.ErrorLast();
            string message = error is null ? "" : ReadUtf8(error->Message);
            failure = $"libgit2 error {result}: {message}";
            return null;
        }

        try
        {
            nuint count = native.EntryCount(list);
            var entries = new List<(string, FileStatus)>(checked((int)count));
            for (nuint i = 0; i < count; i++)
            {
                GitStatusEntry* entry = native.ByIndex(list, i);
                // As LibGit2Sharp's RepositoryStatus: the working directory's path, or else the index's.
                GitDiffDelta* delta = entry->IndexToWorkdir is not null ? entry->IndexToWorkdir : entry->HeadToIndex;
                string path = ReadUtf8(delta->NewFile.Path);
                entries.Add((path, (FileStatus)entry->Status));
            }
            return entries;
        }
        finally
        {
            native.ListFree(list);
        }
    }

    // A null-terminated UTF-8 string from libgit2, or the empty string for a null pointer.
    private static string ReadUtf8(byte* value) =>
        Encoding.UTF8.GetString(MemoryMarshal.CreateReadOnlySpanFromNullTerminated(value));

    // LibGit2Sharp's handle to the repository's git_repository, an internal SafeHandle.
    [UnsafeAccessor(UnsafeAccessorKind.Method, Name = "get_Handle")]
    [return: UnsafeAccessorType("LibGit2Sharp.Core.Handles.RepositoryHandle, LibGit2Sharp")]
    private static extern object GetHandle(LibGit2Sharp.Repository repo);

    [StructLayout(LayoutKind.Sequential)]
    private struct GitStatusOptions
    {
        public const uint Version1 = 1;

        public uint Version;
        public int Show;
        public uint Flags;
        public byte** PathspecStrings;
        public nuint PathspecCount;
        public nint Baseline;
        public ushort RenameThreshold;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct GitStatusEntry
    {
        public int Status;
        public GitDiffDelta* HeadToIndex;
        public GitDiffDelta* IndexToWorkdir;
    }

    [InlineArray(20)]
    private struct GitOid
    {
        private byte _byte;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct GitDiffFile
    {
        public GitOid Id;
        public byte* Path;
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

    [StructLayout(LayoutKind.Sequential)]
    private struct GitError
    {
        public byte* Message;
        public int Class;
    }

    /// <summary>
    /// The libgit2 functions, from the library LibGit2Sharp loads. After a LibGit2Sharp upgrade that changes the libgit2
    /// build this loads nothing, and the status tests fail until the layouts are checked against the new libgit2 and
    /// <see cref="SupportedLibGit2"/> is updated.
    /// </summary>
    private sealed class Native
    {
        public readonly delegate* unmanaged[Cdecl]<GitStatusOptions*, uint, int> OptionsInit;
        public readonly delegate* unmanaged[Cdecl]<nint*, nint, GitStatusOptions*, int> ListNew;
        public readonly delegate* unmanaged[Cdecl]<nint, nuint> EntryCount;
        public readonly delegate* unmanaged[Cdecl]<nint, nuint, GitStatusEntry*> ByIndex;
        public readonly delegate* unmanaged[Cdecl]<nint, void> ListFree;
        public readonly delegate* unmanaged[Cdecl]<GitError*> ErrorLast;

        private Native(nint library)
        {
            OptionsInit = (delegate* unmanaged[Cdecl]<GitStatusOptions*, uint, int>)
                NativeLibrary.GetExport(library, "git_status_options_init");
            ListNew = (delegate* unmanaged[Cdecl]<nint*, nint, GitStatusOptions*, int>)
                NativeLibrary.GetExport(library, "git_status_list_new");
            EntryCount = (delegate* unmanaged[Cdecl]<nint, nuint>)
                NativeLibrary.GetExport(library, "git_status_list_entrycount");
            ByIndex = (delegate* unmanaged[Cdecl]<nint, nuint, GitStatusEntry*>)
                NativeLibrary.GetExport(library, "git_status_byindex");
            ListFree = (delegate* unmanaged[Cdecl]<nint, void>)NativeLibrary.GetExport(library, "git_status_list_free");
            ErrorLast = (delegate* unmanaged[Cdecl]<GitError*>)NativeLibrary.GetExport(library, "git_error_last");
        }

        public static (Native? Native, string? Failure) Load()
        {
            string libGit2 = GlobalSettings.Version.LibGit2CommitSha;
            if (libGit2 != SupportedLibGit2)
            {
                return (null, $"LibGit2Sharp loads libgit2 {libGit2}, not {SupportedLibGit2}.");
            }
            try
            {
                // Through LibGit2Sharp's assembly, so its resolver finds the library it loaded itself.
                nint library = NativeLibrary.Load(
                    $"git2-{SupportedLibGit2}",
                    typeof(LibGit2Sharp.Repository).Assembly,
                    null
                );
                return (new Native(library), null);
            }
            catch (Exception e)
                when (e is DllNotFoundException or BadImageFormatException or EntryPointNotFoundException)
            {
                return (null, $"Could not load libgit2's status functions: {e.Message}");
            }
        }
    }
}
