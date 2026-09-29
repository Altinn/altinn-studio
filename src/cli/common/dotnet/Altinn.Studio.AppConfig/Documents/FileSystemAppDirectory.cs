namespace Altinn.Studio.AppConfig.Documents;

public sealed class FileSystemAppDirectory : IHashingAppDirectory
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

    public bool Exists(string relativePath) => Contained(relativePath) is { } p && File.Exists(p);

    public bool DirectoryExists(string relativeDir) => Contained(relativeDir) is { } p && Directory.Exists(p);

    public byte[]? ReadAllBytes(string relativePath) =>
        ReadHandle(relativePath).Bytes is { } bytes ? (byte[])bytes.Clone() : null;

    public byte[]? ReadExternalBytes(string relativePath)
    {
        var full = Path.GetFullPath(Path.Combine(Root, relativePath));
        return File.Exists(full) ? Utf8Bom.Strip(File.ReadAllBytes(full)) : null;
    }

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
}
