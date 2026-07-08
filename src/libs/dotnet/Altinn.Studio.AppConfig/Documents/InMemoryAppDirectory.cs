using System.Text;

namespace Altinn.Studio.AppConfig.Documents;

public sealed class InMemoryAppDirectory : IWritableAppDirectory
{
    private readonly Dictionary<string, byte[]> _files;

    public InMemoryAppDirectory()
        : this(new Dictionary<string, string>()) { }

    public InMemoryAppDirectory(Dictionary<string, string> files) =>
        _files = files.ToDictionary(kv => kv.Key, kv => Encoding.UTF8.GetBytes(kv.Value), StringComparer.Ordinal);

    public string Root => "/in-memory";

    public bool Exists(string relativePath) => _files.ContainsKey(relativePath);

    public bool DirectoryExists(string relativeDir) =>
        _files.Keys.Any(k => k.StartsWith(relativeDir + "/", StringComparison.Ordinal));

    public byte[]? ReadAllBytes(string relativePath) =>
        _files.TryGetValue(relativePath, out var b) ? Utf8Bom.Strip((byte[])b.Clone()) : null;

    public byte[]? ReadRawBytes(string relativePath) =>
        _files.TryGetValue(relativePath, out var b) ? (byte[])b.Clone() : null;

    public IEnumerable<string> EnumerateFiles(string relativeDir, string searchPattern, bool recursive)
    {
        foreach (var key in _files.Keys)
        {
            if (
                GlobPattern.InDir(key, relativeDir, recursive)
                && GlobPattern.Matches(GlobPattern.FileName(key), searchPattern)
                && !GlobPattern.InBuildOutput(key)
            )
                yield return key;
        }
    }

    public void WriteAllBytes(string relativePath, byte[] bytes)
    {
        var hadBom = _files.TryGetValue(relativePath, out var existing) && Utf8Bom.Has(existing);
        _files[relativePath] = hadBom && !Utf8Bom.Has(bytes) ? Utf8Bom.Prepend(bytes) : (byte[])bytes.Clone();
    }

    public void Delete(string relativePath)
    {
        if (!_files.Remove(relativePath))
            throw new FileNotFoundException($"cannot delete: file does not exist at {relativePath}", relativePath);
    }

    public void Rename(string oldRelativePath, string newRelativePath)
    {
        if (!_files.TryGetValue(oldRelativePath, out var bytes))
            throw new FileNotFoundException(
                $"cannot rename: source does not exist at {oldRelativePath}",
                oldRelativePath
            );
        if (_files.ContainsKey(newRelativePath))
            throw new IOException($"cannot rename: destination already exists at {newRelativePath}");
        _files.Remove(oldRelativePath);
        _files[newRelativePath] = bytes;
    }

    public void Set(string relativePath, string content) => _files[relativePath] = Encoding.UTF8.GetBytes(content);
}
