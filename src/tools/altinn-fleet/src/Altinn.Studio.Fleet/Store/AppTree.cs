using System.Buffers;
using System.Diagnostics.CodeAnalysis;
using System.Formats.Tar;
using System.IO.Compression;
using System.Security.Cryptography;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Sync;

namespace Altinn.Studio.Fleet.Store;

/// <summary>A file of an app as the index records it.</summary>
internal readonly record struct FileRecord(AppFilePath Path, long Size, Sha256Digest Sha256);

/// <summary>The SHA-256 of a file's content, in lower-case hex.</summary>
internal readonly record struct Sha256Digest
{
    private Sha256Digest(string hex)
    {
        Hex = hex;
    }

    public string Hex { get; }

    public static Sha256Digest Of(ReadOnlySpan<byte> hash) =>
        hash.Length == SHA256.HashSizeInBytes
            ? new Sha256Digest(Convert.ToHexStringLower(hash))
            : throw new ArgumentException("A SHA-256 has 32 bytes.", nameof(hash));
}

/// <summary>Where an archive entry's name puts it.</summary>
internal abstract record ArchiveEntryPath
{
    private ArchiveEntryPath() { }

    /// <summary>The archive's top-level folder, which becomes the app's folder.</summary>
    public sealed record Root : ArchiveEntryPath;

    /// <summary>A path inside the app.</summary>
    public sealed record InApp(AppFilePath Path) : ArchiveEntryPath;

    /// <summary>A name that would land outside the app's folder, or is not a path.</summary>
    public sealed record Rejected(string Reason) : ArchiveEntryPath;

    /// <summary>
    /// Reads the entry names of one archive, which has a single top-level folder that the first entry names.
    /// </summary>
    public sealed class Reader
    {
        private string? _root;

        public ArchiveEntryPath Read(string name)
        {
            if (name.Length == 0 || name[0] == '/')
            {
                return new Rejected("an absolute or invalid path");
            }

            string trimmed = name.EndsWith('/') ? name[..^1] : name;
            int slash = trimmed.IndexOf('/', StringComparison.Ordinal);
            string first = slash < 0 ? trimmed : trimmed[..slash];
            _root ??= first;
            if (first.Length == 0 || first is "." or ".." || !string.Equals(first, _root, StringComparison.Ordinal))
            {
                return new Rejected("a path outside the archive's folder");
            }

            SawRoot = true;
            if (slash < 0)
            {
                return new Root();
            }

            string rest = trimmed[(slash + 1)..];
            if (OperatingSystem.IsWindows() && rest.Contains(':', StringComparison.Ordinal))
            {
                return new Rejected("an absolute or invalid path");
            }

            return AppTree.TryPath(rest, out AppFilePath? path)
                ? new InApp(path)
                : new Rejected("a path outside the archive's folder");
        }

        /// <summary>Whether an entry named the top-level folder or something in it.</summary>
        public bool SawRoot { get; private set; }
    }
}

/// <summary>The files of an app's folder, and the archive entries that were left out of it.</summary>
internal sealed record AppFiles(List<FileRecord> Files, List<SkippedEntry> Skipped, long Bytes);

/// <summary>Thrown when an archive is not one an app's source can come from.</summary>
internal sealed class InvalidArchiveException(string message) : Exception(message);

/// <summary>
/// Writes an app's folder from its source archive, or reads one back from disk, in one pass over the bytes. Each
/// file is hashed and given to an <see cref="IAppSourceReader"/> as it goes by. One instance serves one app at a time.
/// </summary>
internal sealed class AppTree : AppSource, IDisposable
{
    internal const long MaxAppBytes = 1L << 30;

    /// <summary>The path of a file in the archive or the folder, when it stays inside the app.</summary>
    internal static bool TryPath(string? relativePath, [NotNullWhen(true)] out AppFilePath? path) =>
        TryCreatePath(relativePath, out path);

    internal const int MaxEntries = 100_000;

    // Files the readers ask for are read whole, up to this size. Larger ones are only hashed and written.
    private const int MaxReadSize = 16 << 20;
    private const int ChunkSize = 128 << 10;
    private const UnixFileMode FileMode644 =
        UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.GroupRead | UnixFileMode.OtherRead;
    private const UnixFileMode DirectoryMode755 =
        FileMode644 | UnixFileMode.UserExecute | UnixFileMode.GroupExecute | UnixFileMode.OtherExecute;

    private readonly IncrementalHash _hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
    private byte[] _buffer = ArrayPool<byte>.Shared.Rent(ChunkSize);

    /// <summary>
    /// Extracts a gzipped tar into a new folder, which the archive's top-level folder becomes. What could land outside
    /// it or hold secrets is left out and listed as skipped.
    /// </summary>
    /// <exception cref="InvalidArchiveException">The archive is not valid, or is too large.</exception>
    public async Task<AppFiles> Extract(
        Stream gzippedTar,
        string destination,
        IAppSourceReader reader,
        CancellationToken cancellationToken
    )
    {
        var files = new List<FileRecord>();
        var skipped = new List<SkippedEntry>();
        var directories = new HashSet<string>(StringComparer.Ordinal);
        long bytes = 0;
        int entries = 0;
        var names = new ArchiveEntryPath.Reader();

        CreateDirectory(destination, directories);
        try
        {
            await using var gzip = new GZipStream(gzippedTar, CompressionMode.Decompress, leaveOpen: true);
            await using var buffered = new BufferedStream(gzip, 64 << 10);
            await using var tar = new TarReader(buffered, leaveOpen: true);
            while (await tar.GetNextEntryAsync(copyData: false, cancellationToken) is { } entry)
            {
                if (++entries > MaxEntries)
                {
                    throw new InvalidArchiveException($"the archive has more than {MaxEntries} entries");
                }

                if (entry.EntryType is TarEntryType.GlobalExtendedAttributes)
                {
                    continue;
                }

                AppFilePath path;
                switch (names.Read(entry.Name))
                {
                    case ArchiveEntryPath.Rejected rejected:
                        skipped.Add(new SkippedEntry(entry.Name, rejected.Reason));
                        continue;
                    case ArchiveEntryPath.InApp inApp:
                        path = inApp.Path;
                        break;
                    default:
                        continue;
                }

                string? reason = entry.EntryType switch
                {
                    TarEntryType.Directory => null,
                    TarEntryType.RegularFile or TarEntryType.V7RegularFile or TarEntryType.ContiguousFile => IsEnvFile(
                        path
                    )
                        ? "a file named .env, which can hold secrets"
                        : null,
                    TarEntryType.SymbolicLink => "a symbolic link",
                    TarEntryType.HardLink => "a hard link",
                    TarEntryType.CharacterDevice or TarEntryType.BlockDevice or TarEntryType.Fifo => "a device or pipe",
                    _ => $"an entry of type {entry.EntryType}",
                };
                if (reason is not null)
                {
                    skipped.Add(new SkippedEntry(path.Value, reason));
                    continue;
                }

                string target = Path.Join(destination, path.Value);
                if (entry.EntryType is TarEntryType.Directory)
                {
                    CreateDirectory(target, directories);
                    continue;
                }

                if (entry.Length > MaxAppBytes - bytes)
                {
                    throw new InvalidArchiveException($"the app is larger than {MaxAppBytes >> 20} MiB");
                }

                if (File.Exists(target) || Directory.Exists(target))
                {
                    skipped.Add(new SkippedEntry(path.Value, "a second entry with the same path"));
                    continue;
                }

                CreateDirectory(Path.Join(destination, path.Directory), directories);
                FileRecord file = await WriteFile(entry, path, target, reader, cancellationToken);
                files.Add(file);
                bytes += file.Size;
            }
        }
        catch (Exception ex) when (ex is InvalidDataException or FormatException or ArgumentException)
        {
            throw new InvalidArchiveException($"the archive is not a valid gzipped tar: {ex.Message}");
        }

        if (!names.SawRoot)
        {
            throw new InvalidArchiveException("the archive is empty");
        }

        files.Sort((x, y) => string.CompareOrdinal(x.Path.Value, y.Path.Value));
        return new AppFiles(files, skipped, bytes);
    }

    /// <summary>Reads an app's folder from disk, as <see cref="Extract"/> would have written it.</summary>
    public AppFiles Scan(string directory, IAppSourceReader reader, CancellationToken cancellationToken)
    {
        var files = new List<FileRecord>();
        var skipped = new List<SkippedEntry>();
        long bytes = 0;
        var pending = new Stack<(string Path, string Relative)>();
        pending.Push((directory, ""));
        while (pending.TryPop(out (string Path, string Relative) current))
        {
            cancellationToken.ThrowIfCancellationRequested();
            foreach (FileSystemInfo info in new DirectoryInfo(current.Path).EnumerateFileSystemInfos())
            {
                string relative = current.Relative.Length == 0 ? info.Name : $"{current.Relative}/{info.Name}";
                if (info.LinkTarget is not null)
                {
                    continue;
                }

                if (info is DirectoryInfo)
                {
                    pending.Push((info.FullName, relative));
                    continue;
                }

                if (!TryPath(relative, out AppFilePath? path))
                {
                    skipped.Add(new SkippedEntry(relative, "an invalid path"));
                    continue;
                }

                using var stream = new FileStream(
                    info.FullName,
                    new FileStreamOptions
                    {
                        Mode = FileMode.Open,
                        Access = FileAccess.Read,
                        Share = FileShare.Read,
                        BufferSize = 0,
                        Options = FileOptions.SequentialScan,
                    }
                );
                long length = stream.Length;
                files.Add(new FileRecord(path, length, ReadFile(stream, length, path, reader)));
                bytes += length;
            }
        }

        files.Sort((x, y) => string.CompareOrdinal(x.Path.Value, y.Path.Value));
        return new AppFiles(files, skipped, bytes);
    }

    public void Dispose()
    {
        _hash.Dispose();
        ArrayPool<byte>.Shared.Return(_buffer);
        _buffer = [];
    }

    internal static bool IsEnvFile(AppFilePath path) =>
        string.Equals(path.FileName, ".env", StringComparison.OrdinalIgnoreCase);

    private async Task<FileRecord> WriteFile(
        TarEntry entry,
        AppFilePath path,
        string target,
        IAppSourceReader reader,
        CancellationToken cancellationToken
    )
    {
        var options = new FileStreamOptions
        {
            Mode = FileMode.CreateNew,
            Access = FileAccess.Write,
            Share = FileShare.None,
            BufferSize = 0,
            PreallocationSize = entry.Length,
        };
        if (!OperatingSystem.IsWindows())
        {
            options.UnixCreateMode = FileMode644;
        }

        using (var file = new FileStream(target, options))
        {
            Sha256Digest sha256 = await CopyEntry(
                entry.DataStream,
                entry.Length,
                path,
                reader,
                file,
                cancellationToken
            );
            if (!OperatingSystem.IsWindows())
            {
                // The create mode is subject to the umask, and the folder is shared, so set it exactly.
                File.SetUnixFileMode(file.SafeFileHandle, FileMode644);
            }

            File.SetLastWriteTimeUtc(file.SafeFileHandle, entry.ModificationTime.UtcDateTime);
            return new FileRecord(path, entry.Length, sha256);
        }
    }

    private async Task<Sha256Digest> CopyEntry(
        Stream? data,
        long length,
        AppFilePath path,
        IAppSourceReader reader,
        FileStream destination,
        CancellationToken cancellationToken
    )
    {
        bool read = length <= MaxReadSize && reader.Accepts(path);
        if (read && length > _buffer.Length)
        {
            Grow((int)length);
        }

        long remaining = length;
        int filled = 0;
        while (remaining > 0)
        {
            int offset = read ? filled : 0;
            int count = (int)Math.Min(remaining, _buffer.Length - offset);
            int got = data is null ? 0 : await data.ReadAsync(_buffer.AsMemory(offset, count), cancellationToken);
            if (got == 0)
            {
                // Most likely a connection that broke off, so it counts as a network error rather than a bad archive.
                throw new EndOfStreamException($"the archive ends inside {path}");
            }

            _hash.AppendData(_buffer, offset, got);
            destination.Write(_buffer, offset, got);
            remaining -= got;
            filled += read ? got : 0;
        }

        if (read)
        {
            reader.Read(path, _buffer.AsMemory(0, filled));
        }

        return Hash();
    }

    // The synchronous twin of CopyEntry, for files on disk.
    private Sha256Digest ReadFile(Stream data, long length, AppFilePath path, IAppSourceReader reader)
    {
        bool read = length <= MaxReadSize && reader.Accepts(path);
        if (read && length >= _buffer.Length)
        {
            // One byte more than the file, to see that it has not grown since its length was read.
            Grow((int)length + 1);
        }

        int filled = 0;
        while (true)
        {
            int offset = read ? filled : 0;
            int got = data.Read(_buffer, offset, _buffer.Length - offset);
            if (got == 0)
            {
                break;
            }

            _hash.AppendData(_buffer, offset, got);
            filled += read ? got : 0;
            if (read && filled == _buffer.Length)
            {
                // The file grew since its length was read; stop feeding the reader.
                read = false;
                filled = 0;
            }
        }

        if (read)
        {
            reader.Read(path, _buffer.AsMemory(0, filled));
        }

        return Hash();
    }

    private Sha256Digest Hash()
    {
        Span<byte> hash = stackalloc byte[SHA256.HashSizeInBytes];
        _hash.GetHashAndReset(hash);
        return Sha256Digest.Of(hash);
    }

    private void Grow(int size)
    {
        ArrayPool<byte>.Shared.Return(_buffer);
        _buffer = ArrayPool<byte>.Shared.Rent(size);
    }

    private static void CreateDirectory(string path, HashSet<string> created)
    {
        if (created.Contains(path))
        {
            return;
        }

        string? parent = Path.GetDirectoryName(path);
        if (parent is not null && created.Count > 0 && !created.Contains(parent))
        {
            CreateDirectory(parent, created);
        }

        if (OperatingSystem.IsWindows())
        {
            Directory.CreateDirectory(path);
        }
        else
        {
            Directory.CreateDirectory(path, DirectoryMode755);
            File.SetUnixFileMode(path, DirectoryMode755);
        }

        created.Add(path);
    }
}
