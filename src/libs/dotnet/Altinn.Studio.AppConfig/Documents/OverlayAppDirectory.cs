using System.Text;

namespace Altinn.Studio.AppConfig.Documents;

public sealed class OverlayAppDirectory : IHashingAppDirectory
{
    private readonly IAppDirectory _base;
    private readonly Dictionary<string, FileHandle> _overlay = new(StringComparer.Ordinal);
    private readonly HashSet<string> _tombstones = new(StringComparer.Ordinal);

    public OverlayAppDirectory(IAppDirectory baseDir) => _base = baseDir;

    public string Root => _base.Root;

    public void Set(string relativePath, byte[] bytes)
    {
        _tombstones.Remove(relativePath);
        var stripped = Utf8Bom.Strip(bytes);
        _overlay[relativePath] = new FileHandle(relativePath, stripped, FileHandle.HashOf(stripped));
    }

    public void Set(string relativePath, string text) => Set(relativePath, Encoding.UTF8.GetBytes(text));

    public void Clear(string relativePath)
    {
        _overlay.Remove(relativePath);
        _tombstones.Remove(relativePath);
    }

    public void Tombstone(string relativePath)
    {
        _overlay.Remove(relativePath);
        _tombstones.Add(relativePath);
    }

    public bool Exists(string relativePath)
    {
        if (_tombstones.Contains(relativePath))
            return false;
        return _overlay.ContainsKey(relativePath) || _base.Exists(relativePath);
    }

    public bool DirectoryExists(string relativeDir)
    {
        foreach (var k in _overlay.Keys)
            if (k.StartsWith(relativeDir + "/", StringComparison.Ordinal))
                return true;
        if (!_base.DirectoryExists(relativeDir))
            return false;
        return EnumerateFiles(relativeDir, "*", recursive: true).Any();
    }

    public byte[]? ReadAllBytes(string relativePath)
    {
        if (_tombstones.Contains(relativePath))
            return null;
        return _overlay.TryGetValue(relativePath, out var handle) ? handle.Bytes : _base.ReadAllBytes(relativePath);
    }

    public byte[]? ReadExternalBytes(string relativePath) => _base.ReadExternalBytes(relativePath);

    FileHandle IHashingAppDirectory.ReadHandle(string relativePath) => ReadHandle(relativePath);

    private FileHandle ReadHandle(string relativePath)
    {
        if (_tombstones.Contains(relativePath))
            return new FileHandle(relativePath, null, 0);
        return _overlay.TryGetValue(relativePath, out var handle) ? handle : FileHandle.Read(_base, relativePath);
    }

    public IEnumerable<string> EnumerateFiles(string relativeDir, string searchPattern, bool recursive)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var file in _base.EnumerateFiles(relativeDir, searchPattern, recursive))
        {
            if (_tombstones.Contains(file))
                continue;
            seen.Add(file);
            yield return file;
        }
        foreach (var key in _overlay.Keys)
        {
            if (seen.Contains(key) || _tombstones.Contains(key))
                continue;
            if (
                !GlobPattern.InDir(key, relativeDir, recursive)
                || !GlobPattern.Matches(GlobPattern.FileName(key), searchPattern)
                || GlobPattern.InBuildOutput(key)
            )
                continue;
            yield return key;
        }
    }
}
