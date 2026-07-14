namespace Altinn.Studio.AppConfig.Models;

internal static class ModelAssembler
{
    public static AppModel Assemble(string root, IReadOnlyList<AppModelBuilder> fragments) =>
        new()
        {
            Root = root,
            ApplicationId = fragments.Select(f => f.ApplicationId).FirstOrDefault(s => !string.IsNullOrEmpty(s)) ?? "",
            DataTypes = fragments.SelectMany(f => f.DataTypes).ToList(),
            Tasks = fragments.SelectMany(f => f.Tasks).ToList(),
            LayoutSets = AssembleLayoutSets(fragments),
            TextResources = fragments.SelectMany(f => f.TextResources).ToList(),
            TitleLanguages = fragments.SelectMany(f => f.TitleLanguages).ToList(),
            SchemaProperties = Fold(fragments, f => f.SchemaProperties),
            SchemaPropertiesByFile = FoldByFile(fragments),
            SchemaPropertyPositions = Fold(fragments, f => f.SchemaPropertyPositions, StringComparer.Ordinal),
            CSharpClasses = Fold(fragments, f => f.CSharpClasses),
            CSharpModel = Fold(fragments, f => f.CSharpModel),
            OptionsFiles = Fold(fragments, f => f.OptionsFiles),
            OptionsProviders = FoldSet(fragments, f => f.OptionsProviders),
            LayoutFiles = FoldSet(fragments, f => f.LayoutFiles),
            Refs = AssembleRefs(fragments),
            ParserNotes = fragments.SelectMany(f => f.ParserNotes).ToList(),
            ParseErrors = fragments.SelectMany(f => f.ParseErrors).ToList(),
            UnsupportedAppVersion = fragments.Select(f => f.UnsupportedAppVersion).FirstOrDefault(v => v is not null),
            AltinnAppVersion = fragments.Select(f => f.AltinnAppVersion).FirstOrDefault(v => v is not null),
        };

    private static Dictionary<string, TValue> Fold<TValue>(
        IReadOnlyList<AppModelBuilder> fragments,
        Func<AppModelBuilder, IEnumerable<KeyValuePair<string, TValue>>> select,
        IEqualityComparer<string>? comparer = null
    )
    {
        var result = comparer is null ? new Dictionary<string, TValue>() : new Dictionary<string, TValue>(comparer);
        foreach (var fragment in fragments)
        {
            foreach (var kv in select(fragment))
                result[kv.Key] = kv.Value;
        }
        return result;
    }

    private static HashSet<string> FoldSet(
        IReadOnlyList<AppModelBuilder> fragments,
        Func<AppModelBuilder, IEnumerable<string>> select
    )
    {
        var result = new HashSet<string>(StringComparer.Ordinal);
        foreach (var fragment in fragments)
            result.UnionWith(select(fragment));
        return result;
    }

    private static IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> FoldByFile(
        IReadOnlyList<AppModelBuilder> fragments
    )
    {
        var result = new Dictionary<string, IReadOnlyDictionary<string, string>>(StringComparer.Ordinal);
        foreach (var fragment in fragments)
        {
            foreach (var (file, props) in fragment.SchemaPropertiesByFile)
            {
                if (result.TryGetValue(file, out var existing) && existing is Dictionary<string, string> merged)
                {
                    foreach (var kv in props)
                        merged[kv.Key] = kv.Value;
                }
                else
                {
                    result[file] = new Dictionary<string, string>(props, StringComparer.Ordinal);
                }
            }
        }
        return result;
    }

    private static SemanticReferences AssembleRefs(IReadOnlyList<AppModelBuilder> fragments) =>
        new()
        {
            ComponentIds = fragments.SelectMany(f => f.Refs.ComponentIds).ToList(),
            LayoutSets = fragments.SelectMany(f => f.Refs.LayoutSets).ToList(),
            DataTypes = fragments.SelectMany(f => f.Refs.DataTypes).ToList(),
            TaskIds = fragments.SelectMany(f => f.Refs.TaskIds).ToList(),
            PageFiles = fragments.SelectMany(f => f.Refs.PageFiles).ToList(),
            DataModel = fragments.SelectMany(f => f.Refs.DataModel).ToList(),
            TextResources = fragments.SelectMany(f => f.Refs.TextResources).ToList(),
            OptionsIds = fragments.SelectMany(f => f.Refs.OptionsIds).ToList(),
            CSharp = fragments.SelectMany(f => f.Refs.CSharp).ToList(),
            PolicyOrgApps = fragments.SelectMany(f => f.Refs.PolicyOrgApps).ToList(),
        };

    private static IReadOnlyList<LayoutSet> AssembleLayoutSets(IReadOnlyList<AppModelBuilder> fragments)
    {
        var targets = new List<LayoutSetBuilder>();
        foreach (var fragment in fragments)
        {
            foreach (var fromSet in fragment.LayoutSets)
            {
                var isDeclaration = !string.IsNullOrEmpty(fromSet.Position.File);
                var target = isDeclaration
                    ? null
                    : targets.FirstOrDefault(s => string.Equals(s.Id, fromSet.Id, StringComparison.Ordinal));
                if (target is null)
                {
                    target = new LayoutSetBuilder { Id = fromSet.Id, Position = fromSet.Position };
                    targets.Add(target);
                }
                target.AllComponents.AddRange(fromSet.AllComponents);
                foreach (var kv in fromSet.Components)
                    target.Components.TryAdd(kv.Key, kv.Value);
                target.PageFileRefs.AddRange(fromSet.PageFileRefs);
                target.DefaultDataReq ??= fromSet.DefaultDataReq;
            }
        }
        return targets.Select(t => t.Freeze()).ToList();
    }
}
