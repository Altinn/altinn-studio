using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;
using Altinn.Studio.AppConfig.Parsers;

namespace Altinn.Studio.AppConfig.Building;

internal sealed record Snapshot(AppModel Model, IReadOnlyList<string> Reparsed);

internal sealed class SnapshotBuilder
{
    private readonly AspectPipeline _pipeline = new();
    private readonly FragmentCache _cache = new();

    private AppModel? _lastModel;
    private AppModelBuilder[]? _lastFragments;

    public Snapshot Build(IAppDirectory dir)
    {
        var reparsed = new List<string>();

        var gate = _cache.GetOrParse(dir, "appversion", AppVersionParser.Parse, reparsed);
        List<AppModelBuilder> fragments;
        if (gate.UnsupportedAppVersion is not null)
        {
            fragments = new List<AppModelBuilder> { gate };
        }
        else
        {
            fragments = new List<AppModelBuilder> { gate };
            AppModelBuilder? layoutsetsFragment = null;
            foreach (var aspect in _pipeline.Aspects)
            {
                var fragment = _cache.GetOrParse(dir, aspect.Name, aspect.Parse, reparsed);
                fragments.Add(fragment);
                if (aspect.Name == "layoutsets")
                    layoutsetsFragment = fragment;
            }
            var layoutsets =
                layoutsetsFragment
                ?? throw new InvalidOperationException("aspect pipeline declares no layoutsets aspect");

            var live = new HashSet<string>(StringComparer.Ordinal);
            foreach (var file in layoutsets.LayoutFiles)
            {
                if (!IsDeclaredLayout(layoutsets, file))
                    continue;
                var key = FragmentCache.LayoutUnitKey(file);
                live.Add(key);
                var capture = file;
                fragments.Add(_cache.GetOrParse(dir, key, (f, r) => ParseLayoutFile(f, r, capture), reparsed));
            }
            _cache.PruneLayoutUnitsExcept(live);
        }

        if (
            _lastModel is { } lastModel
            && _lastFragments is { } lastFragments
            && SameFragments(lastFragments, fragments)
        )
            return new Snapshot(lastModel, reparsed);
        var model = ModelAssembler.Assemble(dir.Root, fragments);
        _lastModel = model;
        _lastFragments = fragments.ToArray();
        return new Snapshot(model, reparsed);
    }

    private static bool SameFragments(AppModelBuilder[] last, List<AppModelBuilder> now)
    {
        if (last.Length != now.Count)
            return false;
        for (var i = 0; i < last.Length; i++)
            if (!ReferenceEquals(last[i], now[i]))
                return false;
        return true;
    }

    private static void ParseLayoutFile(AppModelBuilder fragment, IAppDirectory dir, string file)
    {
        var set = new LayoutSetBuilder { Id = AppPaths.SetIdOf(file) };
        LayoutParser.ParseFile(fragment, dir, set, Path.GetFileNameWithoutExtension(file), file);
        fragment.LayoutSets.Add(set);
    }

    private static bool IsDeclaredLayout(AppModelBuilder model, string file)
    {
        var setId = AppPaths.SetIdOf(file);
        var set = model.LayoutSets.FirstOrDefault(s => string.Equals(s.Id, setId, StringComparison.Ordinal));
        if (set is null)
            return false;
        var page = Path.GetFileNameWithoutExtension(file);
        return set.PageFileRefs.Count == 0
            || set.PageFileRefs.Any(r => string.Equals(r.Value, page, StringComparison.Ordinal));
    }
}
