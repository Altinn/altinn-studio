namespace Altinn.Studio.AppConfig.Documents;

internal sealed class Dependencies
{
    private readonly Dictionary<string, long> _reads;
    private readonly Dictionary<string, bool> _exists;
    private readonly Dictionary<string, bool> _dirs;
    private readonly List<RecordingAppDirectory.EnumQuery> _enums;

    public Dependencies(
        Dictionary<string, long> reads,
        Dictionary<string, bool> exists,
        Dictionary<string, bool> dirs,
        List<RecordingAppDirectory.EnumQuery> enums
    )
    {
        _reads = reads;
        _exists = exists;
        _dirs = dirs;
        _enums = enums;
    }

    public bool IsStale(IAppDirectory dir)
    {
        foreach (var (path, hash) in _reads)
        {
            if (FileHandle.Read(dir, path).Hash != hash)
                return true;
        }
        foreach (var (path, present) in _exists)
        {
            if (dir.Exists(path) != present)
                return true;
        }
        foreach (var (path, present) in _dirs)
        {
            if (dir.DirectoryExists(path) != present)
                return true;
        }
        foreach (var q in _enums)
        {
            var current = dir.EnumerateFiles(q.Dir, q.Pattern, q.Recursive).ToList();
            if (
                current.Count != q.Result.Count
                || !new HashSet<string>(current, StringComparer.Ordinal).SetEquals(q.Result)
            )
                return true;
        }
        return false;
    }
}
