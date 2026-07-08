namespace Altinn.Studio.AppConfig.Documents;

internal sealed class RecordingAppDirectory : IAppDirectory
{
    private readonly IAppDirectory _base;
    private readonly Dictionary<string, long> _reads = new(StringComparer.Ordinal);
    private readonly Dictionary<string, bool> _exists = new(StringComparer.Ordinal);
    private readonly Dictionary<string, bool> _dirs = new(StringComparer.Ordinal);
    private readonly List<EnumQuery> _enums = new();

    public RecordingAppDirectory(IAppDirectory baseDir) => _base = baseDir;

    public string Root => _base.Root;

    public bool Exists(string relativePath)
    {
        var r = _base.Exists(relativePath);
        _exists[relativePath] = r;
        return r;
    }

    public bool DirectoryExists(string relativeDir)
    {
        var r = _base.DirectoryExists(relativeDir);
        _dirs[relativeDir] = r;
        return r;
    }

    public byte[]? ReadAllBytes(string relativePath)
    {
        var handle = FileHandle.Read(_base, relativePath);
        _reads[relativePath] = handle.Hash;
        return handle.Bytes;
    }

    public IEnumerable<string> EnumerateFiles(string relativeDir, string searchPattern, bool recursive)
    {
        var result = _base.EnumerateFiles(relativeDir, searchPattern, recursive).ToList();
        _enums.Add(new EnumQuery(relativeDir, searchPattern, recursive, result));
        return result;
    }

    public Dependencies Snapshot() => new(_reads, _exists, _dirs, _enums);

    internal sealed record EnumQuery(string Dir, string Pattern, bool Recursive, List<string> Result);
}
