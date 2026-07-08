namespace Altinn.Studio.AppConfig.Documents;

public sealed class FileSystemAppDirectory : IWritableAppDirectory, IHashingAppDirectory
{
    public string Root { get; }

    private readonly string _rootPrefix;

    private readonly Dictionary<string, (long Ticks, long Size, byte[] Bytes, long Hash)> _reads = new(
        StringComparer.Ordinal
    );
    private readonly object _readsLock = new();

    public FileSystemAppDirectory(string root)
    {
        Root = Path.GetFullPath(root);
        _rootPrefix = Root.EndsWith(Path.DirectorySeparatorChar) ? Root : Root + Path.DirectorySeparatorChar;
    }

    private string? Contained(string rel)
    {
        var full = Path.GetFullPath(Path.Combine(Root, rel));
        return full == Root || full.StartsWith(_rootPrefix, StringComparison.Ordinal) ? full : null;
    }

    private string AbsForWrite(string rel) =>
        Contained(rel) ?? throw new ArgumentException($"path escapes the app root: \"{rel}\"", nameof(rel));

    public bool Exists(string relativePath) => Contained(relativePath) is { } p && File.Exists(p);

    public bool DirectoryExists(string relativeDir) => Contained(relativeDir) is { } p && Directory.Exists(p);

    public byte[]? ReadAllBytes(string relativePath) => ReadHandle(relativePath).Bytes;

    FileHandle IHashingAppDirectory.ReadHandle(string relativePath) => ReadHandle(relativePath);

    private FileHandle ReadHandle(string rel)
    {
        if (Contained(rel) is not { } abs)
        {
            lock (_readsLock)
                _reads.Remove(rel);
            return new FileHandle(rel, null, 0);
        }
        var info = new FileInfo(abs);
        if (!info.Exists)
        {
            lock (_readsLock)
                _reads.Remove(rel);
            return new FileHandle(rel, null, 0);
        }
        var ticks = info.LastWriteTimeUtc.Ticks;
        var size = info.Length;
        lock (_readsLock)
            if (_reads.TryGetValue(rel, out var c) && c.Ticks == ticks && c.Size == size)
                return new FileHandle(rel, c.Bytes, c.Hash);
        var bytes = Utf8Bom.Strip(File.ReadAllBytes(info.FullName));
        var hash = FileHandle.HashOf(bytes);
        lock (_readsLock)
            _reads[rel] = (ticks, size, bytes, hash);
        return new FileHandle(rel, bytes, hash);
    }

    private void Forget(string rel)
    {
        lock (_readsLock)
            _reads.Remove(rel);
    }

    public IEnumerable<string> EnumerateFiles(string relativeDir, string searchPattern, bool recursive)
    {
        if (Contained(relativeDir) is not { } dir || !Directory.Exists(dir))
            return Enumerable.Empty<string>();
        var opt = recursive ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly;
        return Directory
            .EnumerateFiles(dir, searchPattern, opt)
            .Select(p => Path.GetRelativePath(Root, p).Replace('\\', '/'))
            .Where(rel => !GlobPattern.InBuildOutput(rel));
    }

    public byte[]? ReadRawBytes(string relativePath)
    {
        return Contained(relativePath) is { } p && File.Exists(p) ? File.ReadAllBytes(p) : null;
    }

    public void WriteAllBytes(string relativePath, byte[] bytes)
    {
        var p = AbsForWrite(relativePath);
        var parent = Path.GetDirectoryName(p);
        if (!string.IsNullOrEmpty(parent))
            Directory.CreateDirectory(parent);
        if (!Utf8Bom.Has(bytes) && HasBomOnDisk(p))
            bytes = Utf8Bom.Prepend(bytes);
        File.WriteAllBytes(p, bytes);
        Forget(relativePath);
    }

    private static bool HasBomOnDisk(string absolutePath)
    {
        if (!File.Exists(absolutePath))
            return false;
        using var stream = File.OpenRead(absolutePath);
        Span<byte> head = stackalloc byte[3];
        return stream.ReadAtLeast(head, 3, throwOnEndOfStream: false) == 3 && Utf8Bom.Has(head);
    }

    public void Delete(string relativePath)
    {
        var p = AbsForWrite(relativePath);
        if (!File.Exists(p))
            throw new FileNotFoundException($"cannot delete: file does not exist at {relativePath}", relativePath);
        File.Delete(p);
        Forget(relativePath);
    }

    public void Rename(string oldRelativePath, string newRelativePath)
    {
        var src = AbsForWrite(oldRelativePath);
        var dst = AbsForWrite(newRelativePath);
        if (!File.Exists(src))
            throw new FileNotFoundException(
                $"cannot rename: source does not exist at {oldRelativePath}",
                oldRelativePath
            );
        if (File.Exists(dst))
            throw new IOException($"cannot rename: destination already exists at {newRelativePath}");
        var parent = Path.GetDirectoryName(dst);
        if (!string.IsNullOrEmpty(parent))
            Directory.CreateDirectory(parent);
        File.Move(src, dst);
        Forget(oldRelativePath);
        Forget(newRelativePath);
    }
}
