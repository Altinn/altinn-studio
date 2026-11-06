using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

namespace Altinn.Studio.Preview.Files;

/// <summary>
/// The Linux system calls <see cref="AppFolder"/> opens files with. .NET opens a file by its full path, so a check on
/// the path and the open that follows can see different files when a directory on the way changes in between.
/// <c>openat2</c> resolves a path from a directory that is already open instead, and the kernel refuses any path that
/// leaves that directory or passes through a symbolic link.
/// </summary>
/// <remarks>
/// The flag and error values are the same on x64 and Arm64, the architectures the image is built for.
/// <c>openat2</c> needs Linux 5.6 or later.
/// </remarks>
internal static partial class LinuxFiles
{
    private const string LibC = "libc";

    /// <summary><c>SYS_openat2</c>. glibc has no wrapper for it, so it is called through <c>syscall</c>.</summary>
    private const long Openat2SystemCall = 437;

    /// <summary><c>AT_FDCWD</c>: a path that isn't resolved from an open directory.</summary>
    private const nint CurrentDirectory = -100;

    // open(2) flags. Not O_DIRECTORY or O_NOFOLLOW, whose values differ between x64 and Arm64: a statx call checks
    // what was opened, and the resolve flags refuse links.
    private const ulong OpenReadOnly = 0;
    private const ulong OpenNonBlocking = 0x800; // So that opening a FIFO can't wait for a writer.
    private const ulong OpenCloseOnExec = 0x80000;

    // openat2(2) resolve flags. RESOLVE_NO_SYMLINKS also refuses the kernel's magic links, such as /proc/self/fd/*.
    private const ulong ResolveNoSymbolicLinks = 0x04;
    private const ulong ResolveBeneath = 0x08;

    // statx(2) flags, mask and file types.
    private const int AtSymbolicLinkNoFollow = 0x100;
    private const int AtEmptyPath = 0x1000;
    private const uint StatxType = 0x1;
    private const ushort FileTypeMask = 0xF000;
    private const ushort RegularFileType = 0x8000;
    private const ushort DirectoryType = 0x4000;

    // errno values.
    private const int NotPermitted = 1; // EPERM
    private const int NoSuchEntry = 2; // ENOENT
    private const int Interrupted = 4; // EINTR
    private const int NoSuchDeviceOrAddress = 6; // ENXIO, opening a socket
    private const int TryAgain = 11; // EAGAIN, a rename somewhere during RESOLVE_BENEATH
    private const int AccessDenied = 13; // EACCES
    private const int CrossDevice = 18; // EXDEV, a path that leaves the directory
    private const int NotADirectory = 20; // ENOTDIR
    private const int NameTooLong = 36; // ENAMETOOLONG
    private const int NoSuchSystemCall = 38; // ENOSYS
    private const int TooManyLinks = 40; // ELOOP, a symbolic link

    private const int MaxAttempts = 3;

    /// <summary>
    /// Opens the directory at <paramref name="path"/>, as the operator configured it, links included. For the
    /// repository root only.
    /// </summary>
    /// <returns>The open directory, or <c>null</c> when there is none the service may read.</returns>
    public static SafeFileHandle? OpenTrustedDirectory(string path) =>
        Open(directory: null, path, resolve: 0, FileKind.Directory);

    /// <summary>
    /// Opens the file or directory at <paramref name="path"/> below <paramref name="directory"/> for reading. The
    /// kernel refuses a path that leaves the directory, such as through <c>..</c>, or that passes through a symbolic
    /// link, also one that appears while the path is resolved.
    /// </summary>
    /// <returns>
    /// The open file or directory, or <c>null</c> when there is none of <paramref name="kind"/>, or the path is
    /// refused.
    /// </returns>
    public static SafeFileHandle? OpenBeneath(SafeFileHandle directory, string path, FileKind kind) =>
        Open(directory, path, ResolveBeneath | ResolveNoSymbolicLinks, kind);

    /// <summary>What the entry <paramref name="name"/> in <paramref name="directory"/> is, without following a link.</summary>
    public static FileKind KindOf(SafeFileHandle directory, string name) =>
        KindOf(directory, name, AtSymbolicLinkNoFollow);

    private static SafeFileHandle? Open(SafeFileHandle? directory, string path, ulong resolve, FileKind kind)
    {
        var how = new OpenHow { Flags = OpenReadOnly | OpenNonBlocking | OpenCloseOnExec, Resolve = resolve };
        nuint size = (nuint)Marshal.SizeOf<OpenHow>();

        long descriptor;
        int error;
        int attempts = 0;
        do
        {
            descriptor = directory is null
                ? Openat2(Openat2SystemCall, CurrentDirectory, path, ref how, size)
                : Openat2(Openat2SystemCall, directory, path, ref how, size);
            error = descriptor < 0 ? Marshal.GetLastPInvokeError() : 0;
            attempts++;
        } while (error is TryAgain or Interrupted && attempts < MaxAttempts);

        if (descriptor >= 0)
        {
            var handle = new SafeFileHandle((nint)descriptor, ownsHandle: true);
            if (KindOf(handle, string.Empty, AtEmptyPath) == kind)
            {
                return handle;
            }

            handle.Dispose();
            return null;
        }

        return error switch
        {
            NotPermitted
            or NoSuchEntry
            or NoSuchDeviceOrAddress
            or AccessDenied
            or CrossDevice
            or NotADirectory
            or NameTooLong
            or TooManyLinks => null,
            NoSuchSystemCall => throw new PlatformNotSupportedException(
                "Preview opens files with openat2, which needs Linux 5.6."
            ),
            _ => throw new IOException($"openat2 failed: {Marshal.GetPInvokeErrorMessage(error)}", error),
        };
    }

    private static FileKind KindOf(SafeFileHandle directory, string path, int flags)
    {
        if (Statx(directory, path, flags, StatxType, out StatxBuffer status) != 0 || (status.Mask & StatxType) == 0)
        {
            return FileKind.Other;
        }

        return (status.Mode & FileTypeMask) switch
        {
            RegularFileType => FileKind.File,
            DirectoryType => FileKind.Directory,
            _ => FileKind.Other,
        };
    }

    [LibraryImport(LibC, EntryPoint = "syscall", SetLastError = true, StringMarshalling = StringMarshalling.Utf8)]
    [DefaultDllImportSearchPaths(DllImportSearchPath.SafeDirectories)]
    private static partial long Openat2(long number, nint directory, string path, ref OpenHow how, nuint size);

    [LibraryImport(LibC, EntryPoint = "syscall", SetLastError = true, StringMarshalling = StringMarshalling.Utf8)]
    [DefaultDllImportSearchPaths(DllImportSearchPath.SafeDirectories)]
    private static partial long Openat2(
        long number,
        SafeFileHandle directory,
        string path,
        ref OpenHow how,
        nuint size
    );

    [LibraryImport(LibC, EntryPoint = "statx", SetLastError = true, StringMarshalling = StringMarshalling.Utf8)]
    [DefaultDllImportSearchPaths(DllImportSearchPath.SafeDirectories)]
    private static partial int Statx(
        SafeFileHandle directory,
        string path,
        int flags,
        uint mask,
        out StatxBuffer status
    );

    /// <summary><c>struct open_how</c>.</summary>
    [StructLayout(LayoutKind.Sequential)]
    private struct OpenHow
    {
        public ulong Flags;
        public ulong Mode;
        public ulong Resolve;
    }

    /// <summary>The fields of <c>struct statx</c> that are read here. The kernel writes all 256 bytes.</summary>
    [StructLayout(LayoutKind.Explicit, Size = 256)]
    private struct StatxBuffer
    {
        [FieldOffset(0)]
        public uint Mask;

        [FieldOffset(28)]
        public ushort Mode;
    }
}

/// <summary>What a path in a working copy is.</summary>
internal enum FileKind
{
    /// <summary>Anything that isn't a regular file or a directory, such as a symbolic link, or nothing.</summary>
    Other,
    File,
    Directory,
}
