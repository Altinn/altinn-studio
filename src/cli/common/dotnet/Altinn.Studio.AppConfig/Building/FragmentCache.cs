using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Building;

internal sealed class FragmentCache
{
    public const string LayoutUnitPrefix = "layout::";

    public static string LayoutUnitKey(string file) => LayoutUnitPrefix + file;

    private readonly Dictionary<string, CacheEntry> _cache = new(StringComparer.Ordinal);

    public AppModelBuilder GetOrParse(
        IAppDirectory dir,
        string key,
        Action<AppModelBuilder, IAppDirectory> parse,
        List<string>? reparsed
    )
    {
        if (_cache.TryGetValue(key, out var entry) && !entry.Deps.IsStale(dir))
            return entry.Fragment;
        var fragment = new AppModelBuilder();
        var recorder = new RecordingAppDirectory(dir);
        parse(fragment, recorder);
        _cache[key] = new CacheEntry(recorder.Snapshot(), fragment);
        reparsed?.Add(key);
        return fragment;
    }

    public void PruneLayoutUnitsExcept(IReadOnlySet<string> live)
    {
        foreach (var key in _cache.Keys.Where(k => k.StartsWith(LayoutUnitPrefix, StringComparison.Ordinal)).ToList())
            if (!live.Contains(key))
                _cache.Remove(key);
    }

    private sealed record CacheEntry(Dependencies Deps, AppModelBuilder Fragment);
}
