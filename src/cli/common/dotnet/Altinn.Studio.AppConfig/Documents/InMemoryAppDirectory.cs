using System.Text;

namespace Altinn.Studio.AppConfig.Documents;

public sealed class InMemoryAppDirectory : IAppDirectory
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

    public byte[]? ReadExternalBytes(string relativePath) => null;

    public IEnumerable<string> EnumerateFiles(string relativeDir, string searchPattern, bool recursive)
    {
        ArgumentNullException.ThrowIfNull(searchPattern);
        return EnumerateMatchingFiles(relativeDir, searchPattern, recursive);
    }

    private IEnumerable<string> EnumerateMatchingFiles(string relativeDir, string searchPattern, bool recursive)
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

    public void Set(string relativePath, string content) => _files[relativePath] = Encoding.UTF8.GetBytes(content);
}
